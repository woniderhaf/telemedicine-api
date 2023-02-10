PROJECTNAME = telemedicine-api
PORT = 4444

start:
	docker build -t $(PROJECTNAME) -f deployments/Dockerfile .
	docker run --name $(PROJECTNAME) -d --restart=always -p $(PORT):$(PORT) $(PROJECTNAME)

stop:
	docker rm -f $(PROJECTNAME)
	docker rmi $(PROJECTNAME)

restart:
	make stop
	make start

update:
	git pull
	make restart