
import { Storage } from '@google-cloud/storage';
import { env, exit } from "process";
const storage = new Storage();

env.GOOGLE_APPLICATION_CREDENTIALS = "trading-cloud.json"
//Compare two directory from GCS and compare file by file
function compareDirectories(bucketName, sourceDir, destinationDir) {
    const bucket = storage.bucket(bucketName);
    const sourceDirFiles = bucket.getFiles({ prefix: sourceDir });
    const destinationDirFiles = bucket.getFiles({ prefix: destinationDir });
    return Promise.all([sourceDirFiles, destinationDirFiles]).then((results) => {
        const sourceFiles = results[0][0];
        const destinationFiles = results[1][0];
        const sourceFilesNames = sourceFiles.map((file) => file.name.split('/')[1]);
        const destinationFilesNames = destinationFiles.map((file) => file.name.split('/')[1]);
        const promises = []

        for (let i = 0; i < sourceFilesNames.length; i++) {
            if (destinationFilesNames.indexOf(sourceFilesNames[i]) === -1) {
                console.log(`File ${sourceFilesNames[i]} is missing in destination directory`);
            } else {
                promises.push(compareFiles(bucketName, sourceDir + '/' + sourceFilesNames[i], destinationDir + '/' + sourceFilesNames[i]).then((result) => {
                    if (result) {
                        console.log(`File ${sourceFilesNames[i]} is different`);
                    }
                }));
            }
        }
        return Promise.all(promises)
    });
}

//Compare two files from GCS and return true if they are different
function compareFiles(bucketName, sourceFile, destinationFile) {
    const bucket = storage.bucket(bucketName);
    const sourceFilePromise = bucket.file(sourceFile).download();
    const destinationFilePromise = bucket.file(destinationFile).download();
    return Promise.all([sourceFilePromise, destinationFilePromise]).then((results) => {
        const sourceFileContent = results[0][0];
        const destinationFileContent = results[1][0];
        return sourceFileContent.toString() !== destinationFileContent.toString();
    }).catch(console.error);
}

compareDirectories('simulations-tradingbot', 'simulation640b2e2e9fc9c9302911b877-0', 'simulation640b2379faf00f61d67f18a2-0').then((results) => {
    const differentFiles = results.filter((result) => result);
    console.log(differentFiles);
});