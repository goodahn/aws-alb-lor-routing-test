from gql import gql, Client
from gql.transport.websockets import WebsocketsTransport
import time
import threading

LOAD_BALANCER_URI = "ws://aws-alb-lor-routing-test-640493963.ap-northeast-2.elb.amazonaws.com/graphql"

transport = WebsocketsTransport(url=LOAD_BALANCER_URI)

client = Client(
    transport=transport,
    fetch_schema_from_transport=True,
)

query = gql(
    """subscription {
  numberIncremented
}
"""
)


def request_graphql_subscription():
    for result in client.subscribe(query):
        continue


for _ in range(1000):
    t = threading.Thread(target=request_graphql_subscription, args=[])
    t.start()
    time.sleep(0.1)
