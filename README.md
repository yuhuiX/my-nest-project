# my-nest-project

My nest js project for simple API

## ETL Process

- Extract data from source files (HTML or CSV), stored in `./data/html` or `./data/csv`
- Transform data into internal data structure
- Load transformed data into internal data base in `./data/json`

## Local Testing

Testing with `curl` when developing:

**dbank**

```
curl --header "Content-Type: application/json" -X POST --data '{"month": "01", "year": "2018"}' -i http://localhost:3000/dbank
```

**dkb**

```
curl --header "Content-Type: application/json" -X POST --data '{"month": "08", "year": "2019"}' -i http://localhost:3000/dkb
```
