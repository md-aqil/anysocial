import fs from 'fs';

async function run() {
  const url = "https://pixabay.com/get/g5e12a97e7617a0b3abf2fe579c5745955f9a09360ca31171b35b8ca1d7f7a1d2b8d80cb074fb10faa118259a06a91ac9788441dfb89474ae516a1976bea58163_1280.jpg";
  const response = await fetch(url);
  console.log("Status:", response.status);
  console.log("Text:", await response.text());
}
run();
