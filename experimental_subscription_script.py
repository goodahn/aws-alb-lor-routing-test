from gql import gql, Client
from gql.transport.websockets import WebsocketsTransport
import time
import threading

LOAD_BALANCER_URI = "ws://aws-alb-lor-routing-test-1712008878.ap-northeast-2.elb.amazonaws.com/graphql"

query = gql(
    """subscription {
  numberIncremented
}
"""
)


def request_graphql_subscription(client):
    for result in client.subscribe(query):
        continue


for _ in range(1000):
    transport = WebsocketsTransport(url=LOAD_BALANCER_URI)
    client = Client(
        transport=transport,
        fetch_schema_from_transport=True,
    )
    t = threading.Thread(target=request_graphql_subscription, args=[client])
    t.start()
    time.sleep(0.1)
