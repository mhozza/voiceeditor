import random
random.seed()

for i in range(1, 50):
	sum = 0
	t = []
	for j in range(0, i):
		x = random.randint(1, 10000000000)
		sum += x
		t.append(str(x))
	xfile = open(str(i)+'.in', 'w+')
	xfile.write(str(i) + '\n')
	xfile.write(' '.join(t))
	xfile.close()
	ofile = open(str(i)+'.out', 'w+')
	ofile.write(str(sum))
	ofile.close()
		
