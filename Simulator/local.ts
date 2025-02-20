import { run } from "./Simulate.js";
console.log = () => { }

run(process.argv[2], process.argv[3], process.argv[4], process.argv[5], true)