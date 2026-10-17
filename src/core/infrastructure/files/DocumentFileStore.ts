import * as FileSystem from 'expo-file-system/legacy';
import { DocumentFileStore } from '../../application/DocumentService';

export class ExpoDocumentFileStore implements DocumentFileStore {
  private readonly root = `${FileSystem.documentDirectory}forge-documents/`;
  async persist(sourceUri:string, preferredName?:string):Promise<string>{
    if(!FileSystem.documentDirectory) throw new Error('Armazenamento privado indisponível.');
    await FileSystem.makeDirectoryAsync(this.root,{intermediates:true});
    const sourceName=preferredName??sourceUri.split('/').pop()??'documento';
    const safeName=sourceName.replace(/[^a-zA-Z0-9._-]/g,'_');
    const destination=`${this.root}${Date.now()}-${safeName}`;
    await FileSystem.copyAsync({from:sourceUri,to:destination});
    return destination;
  }
  async exists(uri:string):Promise<boolean>{return (await FileSystem.getInfoAsync(uri)).exists;}
  async fingerprint(uri:string):Promise<{hash?:string;size?:number}>{const info=await FileSystem.getInfoAsync(uri,{md5:true}) as {exists:boolean;md5?:string;size?:number};return {hash:info.md5,size:info.size};}
  async readText(uri:string):Promise<string>{return FileSystem.readAsStringAsync(uri,{encoding:FileSystem.EncodingType.UTF8});}
}
