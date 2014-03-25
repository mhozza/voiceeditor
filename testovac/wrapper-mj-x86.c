/*
 *	A Simple Testing Sandbox
 *
 *	(c) 2001--2004 Martin Mares <mj@ucw.cz>
 *      (c) 2007--2010 Michal Forisek <misof@ksp.sk>
 */

#define _LARGEFILE64_SOURCE
#define _GNU_SOURCE

#include <errno.h>
#include <stdio.h>
#include <fcntl.h>
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>
#include <unistd.h>
#include <getopt.h>
#include <time.h>
#include <sys/wait.h>
#include <sys/user.h>
#include <sys/time.h>
#include <sys/ptrace.h>
#include <sys/signal.h>
#include <sys/sysinfo.h>
#include <sys/syscall.h>
#include <sys/resource.h>

#define NONRET __attribute__((noreturn))
#define UNUSED __attribute__((unused))

static int filter_syscalls;		/* 0=off, 1=liberal, 2=totalitarian */
static long long timeout, last_elapsed_wall, last_elapsed_proc;
static int pass_environ;
static int use_wall_clock;
static int file_access;
static int verbose;
static int memory_limit;
static int allow_times;
static char *redir_stdin, *redir_stdout;
static char *set_cwd;

static pid_t box_pid;
static int is_ptraced;
static volatile int timer_tick;
static long long start_time_msec;
static int ticks_per_sec;

// #if defined(__GLIBC__) && __GLIBC__ == 2 && __GLIBC_MINOR__ > 0
// /* glibc 2.1 or newer -> has lseek64 */
// #define long_seek(f,o,w) lseek64(f,o,w)
// #else
// /* Touching clandestine places in glibc */
// extern loff_t llseek(int fd, loff_t pos, int whence);
// #define long_seek(f,o,w) llseek(f,o,w)
// #endif
#define long_seek(f,o,w) lseek64(f,o,w)

static void NONRET
box_exit(void)
{
  if (box_pid > 0)
    {
      if (is_ptraced)
	ptrace(PTRACE_KILL, box_pid);
      kill(-box_pid, SIGKILL);
      kill(box_pid, SIGKILL);
    }
  exit(1);
}

static void NONRET __attribute__((format(printf,1,2)))
die(char *msg, ...)
{
  va_list args;
  fprintf(stderr,"Time: %lld\nExitCode: 0\nErrors: SEC(",last_elapsed_proc);
  va_start(args, msg);
  vfprintf(stderr, msg, args);
  fputc(')', stderr);
  fputc('\n', stderr);
  box_exit();
}

long long 
get_elapsed_wall(void)
{
  struct timeval ctime;
  long long wall_msec;
  gettimeofday(&ctime,NULL);
  wall_msec = ( 1000000LL * ctime.tv_sec + ctime.tv_usec ) / 1000 - start_time_msec;
  return last_elapsed_wall = wall_msec;
}

long long
get_elapsed_proc(void)
{
  long long proc_msec;
  char buf[4096], *x;
  int c, utime, stime;
  static int proc_status_fd;
  if (!proc_status_fd)
    {
      sprintf(buf, "/proc/%d/stat", (int) box_pid);
      proc_status_fd = open(buf, O_RDONLY);
      // if (proc_status_fd < 0)
      //   die("open(%s): %m", buf);
      return -47;
    }
  lseek(proc_status_fd, 0, SEEK_SET);
  if ((c = read(proc_status_fd, buf, sizeof(buf)-1)) < 0) {
      sprintf(buf, "/proc/%d/stat", (int) box_pid);
      proc_status_fd = open(buf, O_RDONLY);
      if (proc_status_fd < 0) return -47;
    die("read on /proc/$pid/stat: %m");
  }
  if (c >= (int) sizeof(buf) - 1)
    die("/proc/$pid/stat too long");
  buf[c] = 0;
  x = buf;
  while (*x && *x != ' ')
    x++;
  while (*x == ' ')
    x++;
  if (*x++ != '(')
    die("proc syntax error 1");
  while (*x && (*x != ')' || x[1] != ' '))
    x++;
  while (*x == ')' || *x == ' ')
    x++;
  if (sscanf(x, "%*c %*d %*d %*d %*d %*d %*d %*d %*d %*d %*d %d %d", &utime, &stime) != 2)
    die("proc syntax error 2");
  proc_msec = ( (utime + stime) * 1000LL )/ticks_per_sec;
  return last_elapsed_proc = proc_msec;
}

static void __attribute__((format(printf,1,2)))
tolog(char *msg, ...)
{
  va_list args;
  va_start(args, msg);
  if (verbose)
    {
      vfprintf(stderr, msg, args);
      fflush(stderr);
    }
  va_end(args);
}

static void
// valid_filename(unsigned long addr)
//valid_filename(off64_t addr)
valid_filename(long long addr)
{
  char namebuf[4096], *p, *end;
  static int mem_fd;
  return; // FIXME zleee

  // addr = 0;
  // fprintf(stderr,"addr %lld\n",(long long)addr);
  // return;

  if (!file_access)
    die("File access forbidden.");
  if (file_access >= 9)
    return;

  if (!mem_fd)
    {
      sprintf(namebuf, "/proc/%d/mem", (int) box_pid);
      mem_fd = open(namebuf, O_RDONLY);
      if (mem_fd < 0)
	die("open(%s): %m", namebuf);
    }
  p = end = namebuf;
  do
    {
      if (p >= end)
	{
	  int remains = PAGE_SIZE - (addr & (PAGE_SIZE-1));
	  int l = namebuf + sizeof(namebuf) - end;
          // fprintf(stderr,"remains=%d l=%d\n",remains,l);
	  if (l > remains)
	    l = remains;
	  if (!l)
	    die("Access to file with name too long.");
	  if (long_seek(mem_fd, addr, SEEK_SET) < 0)
	    die("long_seek(mem): %m");
	  remains = read(mem_fd, end, l);
	  if (remains < 0)
	    die("read(mem): %m");
	  if (!remains)
	    die("Access to file with name out of memory.");
	  end += l;
	  addr += l;
	}
    }
  while (*p++);

  tolog("[%s] ", namebuf);
  if (file_access >= 3)
    return;
  if (!strchr(namebuf, '/') && strcmp(namebuf, ".."))
    return;
  if (file_access >= 2)
    {
      if ((!strncmp(namebuf, "/etc/", 5) ||
	   !strncmp(namebuf, "/lib/", 5) ||
	   !strncmp(namebuf, "/usr/lib/", 9))
	  && !strstr(namebuf, ".."))
	return;
      if (!strcmp(namebuf, "/dev/null") ||
	  !strcmp(namebuf, "/dev/zero") ||
	  !strcmp(namebuf, "/proc/meminfo") ||
	  !strcmp(namebuf, "/proc/self/stat") ||
	  !strcmp(namebuf, "/proc/self/exe") ||
	  !strncmp(namebuf, "/usr/share/zoneinfo/", 20))
	return;
    }
  die("Forbidden access to file `%s'.", namebuf);
}

static int
valid_syscall(struct user *u)
{
  switch (u->regs.orig_eax)
    {
    case __NR_execve:
      {
	static int exec_counter;
	return !exec_counter++;
      }
    case __NR_open:
    case __NR_creat:
    case __NR_unlink:
    case __NR_oldstat:
    case __NR_access:			
    case __NR_oldlstat:			
    case __NR_truncate:
    case __NR_stat:
    case __NR_lstat:
    case __NR_readlink: // misof
    case __NR_truncate64:
    case __NR_stat64:
    case __NR_lstat64:
      valid_filename((long long)u->regs.ebx);
      return 1;
    case __NR_exit:
    case __NR_read:
    case __NR_write:
    case __NR_close:
    case __NR_lseek:
    case __NR_getpid:
    case __NR_getuid:
    // case __NR_oldfstat:
    case __NR_dup:
    case __NR_brk:
    case __NR_getgid:
    case __NR_geteuid:
    case __NR_getegid:
    case __NR_dup2:
    case __NR_ftruncate:
    case __NR_fstat:
    case __NR_personality:
    // case __NR__llseek:
    case __NR_readv:
    case __NR_writev:
    case __NR_getresuid:
#ifdef __NR_pread64
    case __NR_pread64:
    case __NR_pwrite64:
#else
    case __NR_pread:
    case __NR_pwrite:
#endif
    // case __NR_ftruncate64:
    case __NR_fstat64: /* misof */
    case __NR_fcntl:
    // case __NR_fcntl64:
    case __NR_mmap:
    case __NR_munmap:
    case __NR_ioctl:
    case __NR_uname:
    // case __NR_arch_prctl:
    // case __NR_exit_group:
    case 252:
      return 1;
    case __NR_time:
    case __NR_alarm:
    case __NR_pause:
    // case __NR_signal:
    case __NR_fchmod:
    // case __NR_sigaction:
    // case __NR_sgetmask:
    // case __NR_ssetmask:
    // case __NR_sigsuspend:
    // case __NR_sigpending:
    case __NR_getrlimit:
    case __NR_getrusage:
    case __NR_gettimeofday:
    case __NR_select:
    // case __NR_readdir:
    case __NR_setitimer:
    case __NR_getitimer:
    // case __NR_sigreturn:
    case __NR_mprotect:
    // case __NR_sigprocmask:
    case __NR_getdents:
    case __NR_getdents64:
    // case __NR__newselect:
    case __NR_fdatasync:
    case __NR_mremap:
    case __NR_poll:
    case __NR_getcwd:
    case __NR_nanosleep:
    case __NR_rt_sigreturn:
    case __NR_rt_sigaction:
    case __NR_rt_sigprocmask:
    case __NR_rt_sigpending:
    case __NR_rt_sigtimedwait:
    case __NR_rt_sigqueueinfo:
    case __NR_rt_sigsuspend:
    case __NR_mmap2: /* misof */
    case __NR_set_thread_area: /* misof */
    case __NR_gettid: /* misof */
    case __NR_tgkill: /* misof */
    case __NR_ugetrlimit: /* misof */
    case __NR__sysctl:
      return (filter_syscalls == 1);
    case __NR_times:
      return allow_times;
    case __NR_kill:
      if (u->regs.ebx == box_pid)
	die("Commited suicide by signal %d.", (int)u->regs.ecx);
      return 0;
    default:
      return 0;
    }
}

static void
check_timeout(void)
{
  long long wall_msec, proc_msec;

  wall_msec = get_elapsed_wall();
  proc_msec = get_elapsed_proc();

  if (verbose >= 1)
    fprintf(stderr, "[timecheck: proc %lld ms ; wall %lld ms ; limit %lld ms ]\n", proc_msec, wall_msec, timeout );
  if (proc_msec > 1.1*timeout || wall_msec > 4*timeout) {
    fprintf(stderr,"\nTime: %lld\nExitCode: 0\nErrors: TLE\n",last_elapsed_proc);
    box_exit();
  }
}

static void
signal_alarm(int unused UNUSED)
{
  /* Time limit checks are synchronous, so we only schedule them there. */
  // timer_tick = 1;
  // alarm(1);
  // fprintf(stderr,"tick\n");
  check_timeout();
}

static void
signal_int(int unused UNUSED)
{
  /* Interrupts are fatal, so no synchronization requirements. */
  die("Interrupted.");
}

static void
boxkeeper(void)
{
  int syscall_count = 0;
  struct sigaction sa;

  is_ptraced = 1;
  bzero(&sa, sizeof(sa));
  sa.sa_handler = signal_int;
  sigaction(SIGINT, &sa, NULL);

  struct timeval stime;
  gettimeofday(&stime,NULL);
  start_time_msec = ( 1000000LL * stime.tv_sec + stime.tv_usec ) / 1000;

  ticks_per_sec = sysconf(_SC_CLK_TCK);
  // fprintf(stderr, "[ticks_per_sec: %d]\n", ticks_per_sec);
  if (ticks_per_sec <= 0)
    die("Invalid ticks_per_sec!");
  if (timeout)
    {
      sa.sa_handler = signal_alarm;
      sigaction(SIGALRM, &sa, NULL);
      struct itimerval itimer;
      itimer.it_interval.tv_sec=0; itimer.it_interval.tv_usec=100*1000;
      itimer.it_value.tv_sec=0; itimer.it_value.tv_usec=100*1000;
      setitimer(ITIMER_REAL, &itimer, NULL);
      // alarm(1);
    }
  for(;;)
    {
      struct rusage rus;
      int stat;
      pid_t p;
      if (timer_tick)
	{
	  check_timeout();
	  timer_tick = 0;
	}
      p = wait4(box_pid, &stat, WUNTRACED, &rus);
      if (p < 0)
	{
	  if (errno == EINTR)
	    continue;
	  die("wait4: %m");
	}
      if (p != box_pid)
	die("wait4: unknown pid %d exited!", p);
      if (WIFEXITED(stat))
	{
	  struct timeval total;

	  box_pid = 0;
	  
          timeradd(&rus.ru_utime, &rus.ru_stime, &total);
          last_elapsed_proc = (total.tv_sec*1000000LL + total.tv_usec) / 1000;
          get_elapsed_wall();

	  if (WEXITSTATUS(stat)) {
	    fprintf(stderr,"\nTime: %lld\nExitCode: %d\nErrors: OK\n",last_elapsed_proc,WEXITSTATUS(stat));
            box_exit();
          }
          if (last_elapsed_wall >= 4*timeout || last_elapsed_proc >= timeout) {
	    fprintf(stderr,"\nTime: %lld\nExitCode: 0\nErrors: TLE\n",last_elapsed_proc);
            box_exit();
          }
	  fprintf(stderr,"\nWall: %lld\nTime: %lld\nExitCode: 0\nErrors: OK\n",last_elapsed_wall,last_elapsed_proc);
          // fprintf(stderr, "\nOK (%lld ms real, %lld ms wall, %d syscalls)\n", last_elapsed_proc, last_elapsed_wall, syscall_count);
	  exit(0);
	}
      if (WIFSIGNALED(stat))
	{
	  struct timeval total;
	  box_pid = 0;
          
          timeradd(&rus.ru_utime, &rus.ru_stime, &total);
          // fprintf(stderr,"\n%lld.%06lld\n",total.tv_sec,total.tv_usec);
          last_elapsed_proc = (total.tv_sec*1000000LL + total.tv_usec) / 1000;
          get_elapsed_wall();

	  // die("Caught fatal signal %d.", WTERMSIG(stat));
          fprintf(stderr,"\nTime: %lld\nExitCode: 0\nErrors: EXC(signal %d)\n",last_elapsed_proc,WTERMSIG(stat));
          box_exit();
	}
      if (WIFSTOPPED(stat))
	{
	  int sig = WSTOPSIG(stat);
	  if (sig == SIGTRAP)
	    {
	      struct user u;
	      static int stop_count = -1;
	      if (ptrace(PTRACE_GETREGS, box_pid, NULL, &u) < 0)
		die("ptrace(PTRACE_GETREGS): %m");
	      stop_count++;
	      if (!stop_count)			/* Traceme request */
		tolog(">> Traceme request caught\n");
	      else if (stop_count & 1)		/* Syscall entry */
		{
		  tolog(">> Syscall %3ld (%08lx,%08lx,%08lx) ", u.regs.orig_eax, u.regs.ebx, u.regs.ecx, u.regs.edx);
		  syscall_count++;
		  if (!valid_syscall(&u))
		    {
		      /*
		       * Unfortunately, PTRACE_KILL kills _after_ the syscall completes,
		       * so we have to change it to something harmless (e.g., an undefined
		       * syscall) and make the program continue.
		       */
		      unsigned int sys = u.regs.orig_eax;
		      u.regs.orig_eax = 0xffffffff;
		      if (ptrace(PTRACE_SETREGS, box_pid, NULL, &u) < 0)
			die("ptrace(PTRACE_SETREGS): %m");
		      die("Forbidden syscall %d.", sys);
		    }
		}
	      else					/* Syscall return */
		tolog("= %ld\n", u.regs.eax);
	      ptrace(PTRACE_SYSCALL, box_pid, 0, 0);
	    }
	  else if (sig != SIGSTOP && sig != SIGXCPU && sig != SIGXFSZ)
	    {
	      tolog(">> Signal %d\n", sig);
	      ptrace(PTRACE_SYSCALL, box_pid, 0, sig);
	    }
	  else
	    die("Received signal %d.", sig);
	}
      else
	die("wait4: unknown status %x, giving up!", stat);
    }
}

static void
box_inside(int argc, char **argv)
{
  struct rlimit rl;
  char *args[argc+1];
  char *env[1] = { NULL };

  memcpy(args, argv, argc * sizeof(char *));
  args[argc] = NULL;
  if (set_cwd && chdir(set_cwd))
    die("chdir: %m");
  if (redir_stdin)
    {
      close(0);
      if (open(redir_stdin, O_RDONLY) != 0)
	die("open(\"%s\"): %m", redir_stdin);
    }
  if (redir_stdout)
    {
      close(1);
      if (open(redir_stdout, O_WRONLY | O_CREAT | O_TRUNC, 0666) != 1)
	die("open(\"%s\"): %m", redir_stdout);
    }
  dup2(1, 2);
  setpgrp();
  if (memory_limit)
    {
      rl.rlim_cur = rl.rlim_max = memory_limit * 1024;
      if (setrlimit(RLIMIT_AS, &rl) < 0)
	die("setrlimit: %m");
    }
  rl.rlim_cur = rl.rlim_max = 64;
  if (setrlimit(RLIMIT_NOFILE, &rl) < 0)
    die("setrlimit: %m");
  if (filter_syscalls && ptrace(PTRACE_TRACEME) < 0)
    die("ptrace(PTRACE_TRACEME): %m");
  execve(args[0], args, (pass_environ ? environ : env));
  die("execve(\"%s\"): %m", args[0]);
}

static void
usage(void)
{
  fprintf(stderr, "Invalid arguments!\n");
  printf("\
Usage: box [<options>] -- <command> <arguments>\n\
\n\
Options:\n\
-a <level>\tSet file access level (0=none, 1=cwd, 2=/etc,/lib,..., 3=whole fs, 9=no checks; needs -f)\n\
-c <dir>\tChange directory to <dir> first\n\
-e\t\tPass full environment of parent process\n\
-f\t\tFilter system calls (-ff=very restricted)\n\
-i <file>\tRedirect stdin from <file>\n\
-m <size>\tLimit address space to <size> KB\n\
-o <file>\tRedirect stdout to <file>\n\
-t <time>\tStop after <time> seconds\n\
-T\t\tAllow syscalls for measuring run time\n\
-v\t\tBe verbose\n\
-w\t\tMeasure wall clock time instead of run time\n\
");
  exit(1);
}

int
main(int argc, char **argv)
{
  int c;
  uid_t uid;

  while ((c = getopt(argc, argv, "a:c:efi:m:o:t:Tvw")) >= 0)
    switch (c)
      {
      case 'a':
	file_access = atol(optarg);
	break;
      case 'c':
	set_cwd = optarg;
	break;
      case 'e':
	pass_environ = 1;
	break;
      case 'f':
	filter_syscalls++;
	break;
      case 'i':
	redir_stdin = optarg;
	break;
      case 'm':
	memory_limit = atol(optarg);
	break;
      case 'o':
	redir_stdout = optarg;
	break;
      case 't':
	timeout = atoll(optarg);
	break;
      case 'T':
	allow_times++;
	break;
      case 'v':
	verbose++;
	break;
      case 'w':
	use_wall_clock = 1;
	break;
      default:
	usage();
      }
  if (optind >= argc)
    usage();

  uid = geteuid();
  if (setreuid(uid, uid) < 0)
    die("setreuid: %m");
  box_pid = fork();
  if (box_pid < 0)
    die("fork: %m");
  if (!box_pid)
    box_inside(argc-optind, argv+optind);
  else
    boxkeeper();
  die("Internal error: fell over edge of the world");
}
