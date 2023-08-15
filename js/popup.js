
async function init_main () {
    console.log("function: init_main");
    $('html').hide().fadeIn('slow');

    // let uploads = (await chrome.storage.local.get('uploads'))['uploads'];

    const url = (await chrome.storage.local.get('url'))['url'];
    const token = (await chrome.storage.local.get('token'))['token'];
    console.log('url: ' + url);
    console.log('token: ' + token);

    let headers = {Authorization: token};
    let options = {method: 'POST', headers: headers}
    const response = await fetch(url + '/api/recent/', options);
    console.log('Status: ' + response.status);
    console.log(response);
    if (response.ok) {
        data = await response.json();
    } else {
        data = [];
    }
    console.log(data);

    // console.log(uploads);
    let tbodyRef = document.getElementById('recent').getElementsByTagName('tbody')[0];
    if (data !== undefined) {
        for (let i in data) {
            console.log('url: ' + data[i]);
            let name = data[i].split('/').reverse()[0]
            console.log('name: ' + name)

            let a = document.createElement('a');
            let linkText = document.createTextNode(name);
            a.appendChild(linkText);
            a.title = name;
            a.href = data[i];
            a.target = '_blank';

            let newRow = tbodyRef.insertRow();
            let newCell = newRow.insertCell();
            let count = document.createTextNode(i + ' - ');
            newCell.appendChild(count);
            newCell.appendChild(a);
        }
    }
}

document.addEventListener('DOMContentLoaded', init_main);
