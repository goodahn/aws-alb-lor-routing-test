import requests
import time
import threading

LOAD_BALANCER_URI = "http://aws-alb-lor-routing-test-640493963.ap-northeast-2.elb.amazonaws.com/graphql"
query = """query {
  currentNumber
}
"""
def request_graphql_query():
    resp = requests.post(LOAD_BALANCER_URI, json={"query":query},headers={"content-type":"application/json"})

for _ in range(1000):
    t = threading.Thread(target=request_graphql_query, args=[])
    t.start()
    time.sleep(0.1)