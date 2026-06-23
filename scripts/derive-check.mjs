import { HDNodeWallet } from "ethers";
const xpub = "xpub6D4q6QjNmzw6GR4puGxbrrVFF5J7QW9ugzhMcqCAEAoZP31Cf75fSzrvKY186nP5NhTt9sEk5nTeyVpmnJTH9bU4ZAqDzErBVXopoEDPvoe";
const node = HDNodeWallet.fromExtendedKey(xpub);
for (let i = 0; i < 12; i++) {
  console.log(i, node.derivePath(`0/${i}`).address);
}
