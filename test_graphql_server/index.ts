import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import { createServer } from 'http';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { PubSub } from 'graphql-subscriptions';
import { EventEmitter } from 'events';
import bodyParser from 'body-parser';
import cors from 'cors';

const PORT = 4000;

const biggerEventEmitter = new EventEmitter();
biggerEventEmitter.setMaxListeners(400);
const pubsub = new PubSub({eventEmitter: biggerEventEmitter});

// A number that we'll increment over time to simulate subscription events
let currentNumber = 0;
let queryCount = 0;
let subscriptionCount = 0;
let healthcheckCount = 0;
// Schema definition
const typeDefs = `#graphql
  type Query {
    currentNumber: Int
  }

  type Subscription {
    numberIncremented: Int
  }
`;

let delay = Number(process.env.DELAY);

function getCrrentNumberAfterRandomDelay() {
  queryCount += 1;
  console.log("query requested", Date.now(), queryCount);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
        resolve(currentNumber);
      }, delay * 1000);
    });
 }
 

// Resolver map
const resolvers = {
  Query: {
    currentNumber() {
      return getCrrentNumberAfterRandomDelay();
    },
  },
  Subscription: {
    numberIncremented: {
      subscribe: () => {
        subscriptionCount += 1;
        console.log("subscription requested", Date.now(), subscriptionCount);
        return pubsub.asyncIterator(['NUMBER_INCREMENTED']);
      },
    },
  },
};

// Create schema, which will be used separately by ApolloServer and
// the WebSocket server.
const schema = makeExecutableSchema({ typeDefs, resolvers });

// Create an Express app and HTTP server; we will attach the WebSocket
// server and the ApolloServer to this HTTP server.
const app = express();
const httpServer = createServer(app);

// Set up WebSocket server.
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});
const serverCleanup = useServer({ schema }, wsServer);

// Set up ApolloServer.
const server = new ApolloServer({
  schema,
  plugins: [
    // Proper shutdown for the HTTP server.
    ApolloServerPluginDrainHttpServer({ httpServer }),

    // Proper shutdown for the WebSocket server.
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});

await server.start();
app.use('/graphql', cors<cors.CorsRequest>(), bodyParser.json(), expressMiddleware(server));

const router = express.Router({});
router.get('/', async (_req, res, _next) => {
	// optional: add further things to check (e.g. connecting to dababase)
	const healthcheck = {
		uptime: process.uptime(),
		message: 'OK',
		timestamp: Date.now()
	};
  healthcheckCount += 1;
  console.log("health check count", Date.now(), healthcheckCount);
	try {
		res.send(healthcheck);
	} catch (e) {
		res.status(503).send();
	}
});
app.use('/health', router);

// Now that our HTTP server is fully set up, actually listen.
httpServer.listen(PORT, () => {
  console.log(`🚀 Query endpoint ready at http://localhost:${PORT}/graphql`);
  console.log(`🚀 Subscription endpoint ready at ws://localhost:${PORT}/graphql`);
});

// In the background, increment a number every second and notify subscribers when it changes.
function incrementNumber() {
  currentNumber++;
  pubsub.publish('NUMBER_INCREMENTED', { numberIncremented: currentNumber });
  setTimeout(incrementNumber, 1000);
}

// Start incrementing
incrementNumber();