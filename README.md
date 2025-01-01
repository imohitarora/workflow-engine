# NestJS Workflow Engine

A powerful and flexible workflow engine built with NestJS that allows you to define, execute, and manage complex workflows with multiple steps, dependencies, and conditional logic.

## Features

- Create and manage workflow templates with multiple steps
- Define dependencies between steps
- Specify input/output parameters for each step
- Set conditional logic and branching
- Add timeout and retry mechanisms
- Handle parallel execution
- Support workflow pause/resume functionality
- Comprehensive logging and monitoring
- REST API for workflow management
- PostgreSQL database for persistence

## Prerequisites

- Node.js (v16 or later)
- PostgreSQL (v12 or later)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd workflow-engine
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following variables:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=workflow_engine
NODE_ENV=development
```

4. Create the database:
```bash
createdb workflow_engine
```

## Running the Application

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

## API Documentation

The API documentation is available at `/api` when the application is running. Here are the main endpoints:

### Workflow Definitions

- `POST /workflows` - Create a new workflow definition
- `GET /workflows` - List all workflow definitions
- `GET /workflows/:id` - Get a specific workflow definition
- `PATCH /workflows/:id` - Update a workflow definition
- `DELETE /workflows/:id` - Delete a workflow definition

### Workflow Execution

- `POST /workflows/execute` - Start a new workflow execution
- `POST /workflows/:instanceId/pause` - Pause a running workflow
- `POST /workflows/:instanceId/resume` - Resume a paused workflow
- `POST /workflows/:instanceId/cancel` - Cancel a workflow

## Example Workflow Definition

Here's an example of creating a simple workflow with two steps:

```json
{
  "name": "Simple Approval Workflow",
  "description": "A two-step approval process",
  "steps": [
    {
      "id": "submit",
      "name": "Submit Request",
      "type": "TASK",
      "dependencies": [],
      "config": {
        "handler": "submitHandler",
        "inputMapping": {
          "request": "$.input.request"
        },
        "outputMapping": {
          "requestId": "$.output.id"
        }
      }
    },
    {
      "id": "approve",
      "name": "Approve Request",
      "type": "TASK",
      "dependencies": ["submit"],
      "config": {
        "handler": "approveHandler",
        "inputMapping": {
          "requestId": "$.steps.submit.output.requestId"
        },
        "outputMapping": {
          "approved": "$.output.approved"
        }
      },
      "retryConfig": {
        "maxAttempts": 3,
        "backoffMultiplier": 2,
        "initialDelay": 1000
      }
    }
  ],
  "inputSchema": {
    "request": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "description": { "type": "string" }
      }
    }
  },
  "outputSchema": {
    "requestId": { "type": "string" },
    "approved": { "type": "boolean" }
  }
}
```

## Testing

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
