sources1=$(wildcard *.cpp)
targets1=$(patsubst %.cpp, %.cpp.bin, $(wildcard *.cpp))

sources2=$(wildcard *.cc)
targets2=$(patsubst %.cc, %.cc.bin, $(wildcard *.cc))

sources3=$(wildcard *.c)
targets3=$(patsubst %.c, %.c.bin, $(wildcard *.c))

sources4=$(wildcard *.pas)
targets4=$(patsubst %.pas, %.pas.bin, $(wildcard *.pas))

default: $(targets1) $(targets2) $(targets3) $(targets4)

%.cpp.bin: %.cpp
	g++ -O2 -W -Wall -g $< -o $*.cpp.bin

%.cc.bin: %.cc
	g++ -O2 -W -Wall -g $< -o $*.cc.bin

%.c.bin: %.c
	gcc -O2 -W -Wall -g $< -o $*.c.bin

%.pas.bin: %.pas
	fpc -O1 $< -o$*.pas.bin

