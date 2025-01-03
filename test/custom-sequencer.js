const TestSequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends TestSequencer {
    sort(tests) {
        // Sort the test files in the order you want
        const order = [
            'test/test-database.module.ts',
            'test/app.e2e-spec.ts',
            'test/maker-checker.e2e-spec.ts',
            'test/loan-workflow.e2e-spec.ts',
            'test/workflow.e2e-spec.ts',
        ];

        return tests.sort((a, b) => {
            const indexA = order.indexOf(a.path);
            const indexB = order.indexOf(b.path);
            return indexA - indexB;
        });
    }
}

module.exports = CustomSequencer;