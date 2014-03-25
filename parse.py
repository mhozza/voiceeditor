x = input().split()
for i in range(0, len(x)):
    tfile = open(str(i)+'.in', 'w+')
    tfile.write(str(i+1))
    tfile.close()
    ofile = open(str(i)+'.out', 'w+')
    if (x[i][-1] == '.' or x[i][-1] == ',' or x[i][-1] == '!'):
        x[i] = x[i][:-1]
    ofile.write(x[i].lower())
    ofile.close()
