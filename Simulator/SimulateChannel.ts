var fs = require('fs/promises');

class SimulateChannel {
    async loadData() {
        await fs.readFile('Simulator/data.json', 'utf8')
    }
}