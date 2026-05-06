from neo4j import GraphDatabase
uri='neo4j+s://75e80b28.databases.neo4j.io'
user='neo4j'
password='3RuJzYYjEpYHafQxx6S0tdba_GiDb3D1iFnBF0JYqb4'
try:
 driver=GraphDatabase.driver(uri, auth=(user, password))
 driver.verify_connectivity()
 print('Success!')
except Exception as e:
 print(e)
