
async function show_error(message) {
    let div = document.getElementById('auth-fail');
    div.style.display = "block";
    div.innerHTML = message;
}

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
    let response;
    let data;
    try {
        response = await fetch(url + '/api/recent/', options);
        data = await response.json();
    } catch (error) {
        console.log(error);
        return await show_error(error.message);
    }
    console.log('Status: ' + response.status);
    console.log(response);
    if (data === undefined) {
        return await show_error('Response Data Undefined.');
    }
    if (!response.ok) {
        console.log('error: ' + data['error']);
        return await show_error(data['error']);
    }
    if (data.length === 0) {
        return await show_error('No Files Returned.');
    }

    console.log(data);
    let tbodyRef = document.getElementById('recent').getElementsByTagName('tbody')[0];
    for (let i in data) {
        // console.log('url: ' + data[i]);
        let name = data[i].split('/').reverse()[0];
        // console.log('name: ' + name);
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

document.addEventListener('DOMContentLoaded', init_main);
