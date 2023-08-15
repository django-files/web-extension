
async function init_main () {
    console.log("function: init_main");
    $('html').hide().fadeIn('slow');
    let uploads = (await chrome.storage.local.get('uploads'))['uploads'];
    // console.log(uploads);
    let tbodyRef = document.getElementById('uploads').getElementsByTagName('tbody')[0];
    if (uploads !== undefined) {
        for (let i in uploads.reverse()) {
            console.log('url: ' + uploads[i]);
            let name = uploads[i].split('/').reverse()[0]
            console.log('name: ' + name)

            let a = document.createElement('a');
            let linkText = document.createTextNode(name);
            a.appendChild(linkText);
            a.title = name;
            a.href = uploads[i];
            a.target = '_blank';

            let newRow = tbodyRef.insertRow();
            let newCell = newRow.insertCell();
            let count = document.createTextNode(i + '. ');
            newCell.appendChild(count);
            newCell.appendChild(a);
        }
    }
}

document.addEventListener('DOMContentLoaded', init_main);
