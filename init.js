import startGarden from './flower.js';

let texts;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('showImage').style.display = 'none';
    fetch('data.txt')
        .then(response => {
            if(!response.ok){
                throw new Error("No se pudo cargar el archivo");                
            }
            return response.json();
        })
        .then(text => {
            // Procesando el texto
            document.getElementById('title').textContent = text.title;
            document.getElementById('name').textContent = text.name;
            texts = text;
        })
        .catch(error => {
            console.error('Error', error);
            //document.getElementById('nameInput').innerText = 'Error al cargar datos';
        });
});

document.getElementById('startBtn').addEventListener('click', () => {
  startGarden(texts.name, texts.phrase_one);
});

window.addEventListener('resize', () => {
  if (document.getElementById('c').style.display === 'block') startGarden(texts.name, texts.phrase_one);
});