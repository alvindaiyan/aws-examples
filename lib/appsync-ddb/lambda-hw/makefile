BINARY_NAME=main

build:
	GOARCH=amd64 GOOS=linux go build -o ${BINARY_NAME} main.go
	zip -r main.zip ${BINARY_NAME}

run:
	go build -o ${BINARY_NAME} main.go
	./${BINARY_NAME}

clean:
	go clean
	rm ${BINARY_NAME}


#build:
#    go build -o ${BINARY_NAME} main.go
#
#run:
#    go build -o ${BINARY_NAME} main.go
#    ./${BINARY_NAME}
#
#clean:
#    go clean
#    rm ${BINARY_NAME}