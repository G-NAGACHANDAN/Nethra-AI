import * as FileSystem from 'expo-file-system/legacy';

export const CachesDirectoryPath = FileSystem.cacheDirectory;
export const DocumentDirectoryPath = FileSystem.documentDirectory;
export const MainBundlePath = FileSystem.bundleDirectory;

export async function readFile(filepath: string, encoding?: string): Promise<string> {
    const options = {
        encoding: encoding === 'base64' ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8,
    };
    return FileSystem.readAsStringAsync(filepath, options);
}

export async function exists(filepath: string): Promise<boolean> {
    const info = await FileSystem.getInfoAsync(filepath);
    return info.exists;
}

export async function writeFile(filepath: string, contents: string, encoding?: string): Promise<void> {
    const options = {
        encoding: encoding === 'base64' ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8,
    };
    return FileSystem.writeAsStringAsync(filepath, contents, options);
}

export default {
    CachesDirectoryPath,
    DocumentDirectoryPath,
    MainBundlePath,
    readFile,
    exists,
    writeFile
};
