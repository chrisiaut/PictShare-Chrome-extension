var bkg = chrome.extension.getBackgroundPage();
var baseURL = 'https://pictshare.net/'

chrome.contextMenus.create({"title": "Upload this image to PictShare", "contexts":["image"], onclick: function(info)
{
  console.log(info.linkUrl);
  //console.log(info);

  if (info.srcUrl.substring(0, 4) == "data")
  {
    console.log("got base64");
    var arr = info.srcUrl.split(";");
    var arr2 = arr[0].split("/");
    uploadBase64(info.srcUrl,arr2[0]);
  }
  else
  {
    clickedImage(info.srcUrl);
  }
  
}});

chrome.contextMenus.create({"title": "Upload this Video to PictShare", "contexts":["video"], onclick: function(info)
{
  console.log("Uploading mp4: "+info.srcUrl);
  getVideo(info.srcUrl);
}});

chrome.contextMenus.create({"title": "Upload selected text","contexts": ["selection"], onclick: function(info) {
  uploadText(info.selectionText);
}});

chrome.contextMenus.create({"title": "Upload HTML of this page","contexts": ["page"], onclick: function(info) {
  getHTMLPage(info.pageUrl);
}});

chrome.contextMenus.create({"title": "Upload Screenshot to PictShare","contexts": ["page", "selection", "link"], onclick: function(info) {
    chrome.tabs.captureVisibleTab(null, {}, function (image) {
          console.log("Got screenshot!");
          uploadBase64(image,'image/jpeg');
    });
}});


function getHTMLPage(url)
{
  var xhr = new XMLHttpRequest();
  xhr.open("GET", baseURL+"api/geturl.php?url="+encodeURIComponent(url), true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      var resp = JSON.parse(xhr.responseText);
      if(resp.url && resp.filetype == 'text')
      {
        bkg.console.log("Success!");
        chrome.tabs.create({ url: resp.url });
      }
    }
  }
  xhr.send();
}

function storeUploadinfo(resp)
{
  var hash = resp.hash;
  var deletecode = (resp.delete_code!==undefined)?resp.delete_code:true;

  var obj= {};
  obj[hash] = deletecode;

  chrome.storage.sync.set(obj, function() {
    console.log('Value stored ', obj);
  });
}

function getVideo(url)
{
  var xhr = new XMLHttpRequest();
  xhr.open("GET", baseURL+"api/geturl.php?url="+encodeURIComponent(url), true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      var resp = JSON.parse(xhr.responseText);
      console.log(resp);
      if(resp.url)
      {
        storeUploadinfo(resp)
        bkg.console.log("Success!");
        chrome.tabs.create({ url: resp.url });
      }
    }
  }
  xhr.send();
}

function clickedImage(url)
{
  //send to pictshare
  bkg.console.log("Trying to send image via geturl");
  var xhr = new XMLHttpRequest();
  xhr.open("GET", baseURL+"api/geturl.php?url="+encodeURIComponent(url), true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      var resp = JSON.parse(xhr.responseText);
      if(resp.url && resp.filetype != 'text')
      {
        storeUploadinfo(resp);
        
        bkg.console.log("Success!");
        chrome.tabs.create({ url: resp.url });
      }
      else if(resp.status='err') // if we couldn't upload, try as base64
      {
        bkg.console.log("Failed via url. Trying base64");
          if (!getPathFromUrl(url).match(/\.(jpg|jpeg)$/))
            convertImgToBase64(url, uploadBase64,'image/png');
          else convertImgToBase64(url, uploadBase64,'image/jpeg');
      }
      bkg.console.log(resp);
    }
  }
  xhr.send();
}

function getPathFromUrl(url) {
  return url.split("?")[0];
}

function uploadText(text)
{
  var xhr = new XMLHttpRequest();

  var url = baseURL+"api/pastebin.php";
  var params = "api_paste_code="+text;
  xhr.open("POST", url, true);
  xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      var resp = xhr.responseText;
      if(resp.startsWith("http"))
      {
        chrome.tabs.create({ url: resp });
      }
    }
  }
  xhr.send(params);
}

function uploadBase64(info,format)
{
  console.log("Uploading in format "+format);
  var xhr = new XMLHttpRequest();

  var url = baseURL+"api/base64.php";
  var params = "format="+format+"&base64="+info;
  xhr.open("POST", url, true);
  xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      var resp = JSON.parse(xhr.responseText);
      if(resp.url)
      {
        storeUploadinfo(resp);
        chrome.tabs.create({ url: resp.url });
      }
      bkg.console.log(resp);
    }
  }
  xhr.send(params);
}

/**
 * convertImgToBase64
 * @param  {String}   url
 * @param  {Function} callback
 * @param  {String}   [outputFormat='image/png']
 * @author HaNdTriX
 * @example
  convertImgToBase64('http://goo.gl/AOxHAL', function(base64Img){
    console.log('IMAGE:',base64Img);
  })
 */
function convertImgToBase64(url, callback, outputFormat){
  console.log("converting to base64");
  var canvas = document.createElement('CANVAS');
  var ctx = canvas.getContext('2d');
  var img = new Image;
  img.crossOrigin = 'Anonymous';
  img.onload = function(){
    canvas.height = img.height;
    canvas.width = img.width;
      ctx.drawImage(img,0,0);
      var dataURL = canvas.toDataURL(outputFormat || 'image/png');
      callback.call(this, dataURL,outputFormat);
        // Clean up
      canvas = null; 
  };
  img.src = url;
}