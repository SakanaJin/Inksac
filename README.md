# Inksac

**[ADD A DESCRIPTION HERE]**

## Setup

This setup is for a development environment only.

Inksac was created using **python3.14.2** and **node24.10.0**, while other versions may work we recommend these versions.
Inksac was created with **mysql** in mind. Other sql databases may work, but we recommend **mysql**.

Create a file named _".env"_ inside of _/Inksac/Inksac_Data_.

#### .env

```
DBSTRING=mysql+pymysql://<dbuser>:<password>@localhost:3306/Inksac
ALLOWORIGINS=["http://127.0.0.1:5173", "http://localhost:5173", "http://127.0.0.1:4173", "http://localhost:4173"]
SECRET_KEY=<key for cookies>
```

Create a file named _".env"_ inside of _/Inksac/Inksac-Web_.

#### .env

```
PORT=5173
WDS_SOCKET_PORT=8000
VITE_ENVIRONMENT=local
VITE_BUILD_NUMBER=local
VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_MEDIA_BASE_URL=http://127.0.0.1:8000
```

While still in _/Inksac/Inksac-Web_ run the command:
`npm install`

### Windows

In the root directory of the project run the following commands.</br>
`python -m venv .venv`</br>
`.\.venv\Scripts\activate.bat` for cmd or `.\.venv\Scripts\activate.ps1` for powershell</br>
`pip install -r requirements.txt`</br>

### Linux

In the root directory of the project run the following commands.</br>
`python3 -m venv .venv`</br>
`source ./.venv/bin/activate`</br>
`pip install -r requirements.txt`</br>

## Running

To start the backend run the following command in the root directory **WITH THE VENV ACTIVATED**: `uvicorn Inksac_Data.main:app`

To start the frontend, open a new terminal and cd into _/Inksac/Inksac-Web_.
Run the following command: `npm run dev`
