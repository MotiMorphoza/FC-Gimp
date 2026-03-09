(function () {
"use strict";

var SHOP_STORE_KEY="shopStore";
var LEGACY_CART_KEY="moto_cart_v2";
var UI_KEY="shopUiV2";
var SHOP_INDEX_FALLBACK="shop/index.json";

var SIZE_ORDER=["A6","A5","A4","A3","A2","A1"];
var SIZE_DESC={A6:"POSTCARD",A5:"SMALL PRINT",A4:"STANDARD PRINT",A3:"RECOMMENDED",A2:"LARGE POSTER",A1:"POSTER"};

var COUNTRIES=[
{code:"PL",name:"Poland"},{code:"PT",name:"Portugal"},{code:"DE",name:"Germany"},
{code:"FR",name:"France"},{code:"US",name:"United States"},{code:"GB",name:"United Kingdom"},
{code:"ES",name:"Spain"},{code:"IT",name:"Italy"},{code:"NL",name:"Netherlands"},
{code:"BE",name:"Belgium"},{code:"SE",name:"Sweden"},{code:"NO",name:"Norway"},
{code:"DK",name:"Denmark"},{code:"FI",name:"Finland"},{code:"IE",name:"Ireland"},
{code:"AT",name:"Austria"},{code:"CH",name:"Switzerland"},{code:"CZ",name:"Czech Republic"},
{code:"SK",name:"Slovakia"},{code:"HU",name:"Hungary"},{code:"RO",name:"Romania"},
{code:"GR",name:"Greece"},{code:"IL",name:"Israel"},{code:"CA",name:"Canada"},
{code:"AU",name:"Australia"},{code:"JP",name:"Japan"},{code:"IN",name:"India"}
];

var app={
codeMap:new Map(),
indexPromise:null,
refs:null,
highlightCode:"",
paypal:{sdkPromise:null,rendering:false,rendered:false,actions:null,processing:false,timer:null}
};

function h(tag,attrs){
var n=document.createElement(tag);
Object.keys(attrs||{}).forEach(function(k){
var v=attrs[k];
if(v===null||typeof v==="undefined")return;
if(k==="className")n.className=v;
else if(k==="text")n.textContent=v;
else n.setAttribute(k,v);
});
return n;
}

function clear(node){while(node.firstChild)node.removeChild(node.firstChild);}

function cfg(){
return window.SHOP_CONFIG||{
currency:"EUR",
storeCountry:"PL",
shipping:{local:{base:7,freeAbove:77},international:{base:27,freeAbove:222}},
shopIndexUrl:SHOP_INDEX_FALLBACK
};
}

function sizes(){
return Array.isArray(window.PRINT_SIZES)&&window.PRINT_SIZES.length?window.PRINT_SIZES:[
{id:"A6",dims:"10.5 x 14.8 cm",price:2.5},
{id:"A5",dims:"14.8 x 21 cm",price:5},
{id:"A4",dims:"21 x 29.7 cm",price:10},
{id:"A3",dims:"29.7 x 42 cm",price:20},
{id:"A2",dims:"42 x 59.4 cm",price:40},
{id:"A1",dims:"59.4 x 84.1 cm",price:70}
];
}

function money(v){return String((cfg().currency||"EUR").toUpperCase())+" "+Number(v||0).toFixed(2);}

function parseJSON(raw,fallback){try{return JSON.parse(raw);}catch(_e){return fallback;}}

function placeholder(){
return"data:image/svg+xml;utf8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#111"/><text x="50%" y="50%" fill="#666" font-size="10" text-anchor="middle" dominant-baseline="middle">NO PREVIEW</text></svg>');
}

function sanitizeStore(input){
var out={select:{},cart:{}};
var src=input&&typeof input==="object"?input:{};

Object.keys(src.select||{}).forEach(function(code){
var key=String(code||"").trim().toUpperCase();
if(!key)return;
var item=src.select[code]||{};
var size=String(item.size||"A3").toUpperCase();
if(SIZE_ORDER.indexOf(size)===-1)size="A3";
out.select[key]={size:size,thumb:String(item.thumb||"")};
});

Object.keys(src.cart||{}).forEach(function(code){
var key=String(code||"").trim().toUpperCase();
if(!key)return;
var item=src.cart[code]||{};
var cleanSizes={};
Object.keys(item.sizes||{}).forEach(function(sid){
var id=String(sid||"").toUpperCase();
var qty=parseInt(item.sizes[sid],10);
if(SIZE_ORDER.indexOf(id)===-1||!isFinite(qty)||qty<1)return;
cleanSizes[id]=qty;
});
if(!Object.keys(cleanSizes).length)return;
out.cart[key]={thumb:String(item.thumb||""),sizes:cleanSizes};
});

return out;
}

function loadStore(){
return sanitizeStore(parseJSON(localStorage.getItem(SHOP_STORE_KEY)||"",{select:{},cart:{}}));
}

function rowsFromCart(store){
var rows=[];
Object.keys(store.cart||{}).forEach(function(code){
var group=store.cart[code]||{};
Object.keys(group.sizes||{}).forEach(function(sid){
var qty=parseInt(group.sizes[sid],10);
if(!isFinite(qty)||qty<1)return;
var sizeMeta=sizes().find(function(s){return String(s.id).toUpperCase()===String(sid).toUpperCase();})||{price:0};
rows.push({code:code,size:sid,qty:qty,price:Number(sizeMeta.price||0),thumb:String(group.thumb||"")});
});
});
return rows;
}

function saveStore(store){
var clean=sanitizeStore(store);
try{localStorage.setItem(SHOP_STORE_KEY,JSON.stringify(clean));}catch(_e){}
return clean;
}

function loadUi(){
var raw=parseJSON(localStorage.getItem(UI_KEY)||"",{});
return{
country:String(raw.country||""),
email:String(raw.email||""),
name:String(raw.name||""),
street:String(raw.street||""),
city:String(raw.city||""),
postal:String(raw.postal||""),
notes:String(raw.notes||"")
};
}

function saveUi(ui){
try{localStorage.setItem(UI_KEY,JSON.stringify(ui));}catch(_e){}
}

function isValidEmail(v){
return/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||"").trim());
}

function isFormValid(ui){
return(
isValidEmail(ui.email)&&
ui.name.trim().length>1&&
ui.street.trim().length>3&&
ui.city.trim().length>1&&
ui.postal.trim().length>1&&
ui.country.trim().length>1
);
}

function uiState(){
return{
country:String(app.refs.countryInput.value||""),
email:String(app.refs.emailInput.value||""),
name:String(app.refs.nameInput.value||""),
street:String(app.refs.streetInput.value||""),
city:String(app.refs.cityInput.value||""),
postal:String(app.refs.postalInput.value||""),
notes:String(app.refs.notesInput.value||"")
};
}

function canCheckout(store,ui){
return rowsFromCart(store).length>0&&isFormValid(ui);
}

function buildShop(root){

clear(root);

root.appendChild(h("h1",{text:"Fine Art Prints"}));

root.appendChild(h("p",{text:"Prints on premium art paper. Ships in protective packaging, ready to frame."}));
root.appendChild(h("p",{text:"To order: Browse project galleries and click an image code to add prints to your cart."}));

var countryWrap=h("div",{});
countryWrap.appendChild(h("label",{for:"shop-country",text:"Shipping country"}));
var countryInput=h("input",{id:"shop-country",list:"country-list"});
var dl=h("datalist",{id:"country-list"});
COUNTRIES.forEach(function(c){dl.appendChild(h("option",{value:c.name}));});
countryWrap.appendChild(countryInput);
countryWrap.appendChild(dl);
root.appendChild(countryWrap);

var checkout=h("section",{});
checkout.appendChild(h("h2",{text:"Customer details form"}));

function field(id,label){
var wrap=h("div",{});
wrap.appendChild(h("label",{for:id,text:label}));
var input=h("input",{id:id,className:"shop-input"});
wrap.appendChild(input);
return{wrap:wrap,input:input};
}

var email=field("shop-email","Email");
var name=field("shop-name","Full name");
var street=field("shop-street","Street address");
var city=field("shop-city","City");
var postal=field("shop-postal","Postal code");

checkout.appendChild(email.wrap);
checkout.appendChild(name.wrap);
checkout.appendChild(street.wrap);
checkout.appendChild(city.wrap);
checkout.appendChild(postal.wrap);

var notesWrap=h("div",{});
notesWrap.appendChild(h("label",{for:"shop-notes",text:"Order notes (optional)"}));
var notesInput=h("textarea",{id:"shop-notes",rows:"3"});
notesWrap.appendChild(notesInput);
checkout.appendChild(notesWrap);

var paypalWrap=h("div",{});
var paypalContainer=h("div",{id:"paypal-button-container"});
var paypalOverlay=h("div",{className:"paypal-overlay",text:"Complete checkout details to enable PayPal."});

paypalWrap.appendChild(paypalContainer);
paypalWrap.appendChild(paypalOverlay);
checkout.appendChild(paypalWrap);

root.appendChild(checkout);

return{
root:root,
countryInput:countryInput,
emailInput:email.input,
nameInput:name.input,
streetInput:street.input,
cityInput:city.input,
postalInput:postal.input,
notesInput:notesInput,
paypalContainer:paypalContainer,
paypalOverlay:paypalOverlay
};
}

function syncPayPalState(store,ui){

if(!rowsFromCart(store).length){
app.refs.paypalOverlay.style.display="block";
return;
}

if(!isFormValid(ui)){
app.refs.paypalOverlay.style.display="block";
if(app.paypal.actions){
try{app.paypal.actions.disable();}catch(e){}
}
}else{
app.refs.paypalOverlay.style.display="none";
if(app.paypal.actions){
try{app.paypal.actions.enable();}catch(e){}
}
}

}

function render(){

var store=loadStore();
var ui=uiState();

saveUi(ui);

syncPayPalState(store,ui);

}

function bindEvents(){

["countryInput","emailInput","nameInput","streetInput","cityInput","postalInput","notesInput"].forEach(function(k){
app.refs[k].addEventListener("input",render);
app.refs[k].addEventListener("change",render);
});

}

function initShopPage(){

var root=document.getElementById("shop-root");
if(!root)return;

app.refs=buildShop(root);

var ui=loadUi();

app.refs.countryInput.value=ui.country;
app.refs.emailInput.value=ui.email;
app.refs.nameInput.value=ui.name;
app.refs.streetInput.value=ui.street;
app.refs.cityInput.value=ui.city;
app.refs.postalInput.value=ui.postal;
app.refs.notesInput.value=ui.notes;

bindEvents();
render();

}

window.initShopPage=initShopPage;

if(document.readyState==="loading"){
document.addEventListener("DOMContentLoaded",initShopPage);
}else{
initShopPage();
}

})();