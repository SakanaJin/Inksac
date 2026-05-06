install: 
	./.venv/bin/pip install -r requirements.txt
	cd Inksac-Web && npm install

runb:
	./.venv/bin/uvicorn Inksac_Data.main:app

runf:
	cd Inksac-Web && npm run dev

run:
	./.venv/bin/uvicorn Inksac_Data.main:app & cd Inksac-Web && npm run dev

resetdb:
	mysql -u root -p -e "DROP DATABASE IF EXISTS Inksac; CREATE DATABASE Inksac; GRANT ALL PRIVILEGES ON Inksac.* to 'inkuser'@'localhost'; FLUSH PRIVILEGES;"

setup:
	@echo "Creating python virtual environment..."
	python3 -m venv .venv
	@echo "Inkstalling backend dependencies..."
	./.venv/bin/pip install -r requirements.txt
	@echo "Inkstalling frontend dependencies..."
	cd Inksac-Web && npm install
	@echo "Creating template .env files (do not use in prod)..."
	cp frontendenv.example ./Inksac-Web/.env
	cp backendenv.example ./.env
	@echo "Creating Database..."
	mysql -u root -p < ./dbsetup.sql
	@echo "Database created with user 'inkuser' and password 'password'"
	@echo "Setup Complete"
