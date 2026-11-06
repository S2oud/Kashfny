const DB='gulf-talent-posts-v1';
function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,2);r.onupgradeneeded=()=>{for(const store of ['history','contacts'])if(!r.result.objectStoreNames.contains(store))r.result.createObjectStore(store)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function read(store){const db=await open();try{return await new Promise((resolve,reject)=>{const r=db.transaction(store).objectStore(store).get('latest');r.onsuccess=()=>resolve(Array.isArray(r.result)?r.result.slice(0,10):[]);r.onerror=()=>reject(r.error)})}finally{db.close()}}
async function write(store,history){const db=await open();try{await new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(history.slice(0,10),'latest');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}finally{db.close()}}
export const readPostHistory=()=>read('history');
export const writePostHistory=history=>write('history',history);
export const readContactHistory=()=>read('contacts');
export const writeContactHistory=history=>write('contacts',history);
