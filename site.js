const rollCall = require('./')
const qs = require('querystring')
const funky = require('funky')
const bel = require('bel')
const emojione = require('emojione')
const random = () => Math.random().toString(36).substr(7)

let opts = qs.parse(window.location.search.slice(1))
let mainElement = document.getElementById('rollcall-main')

const initPicker = (elem, opts) => {
  elem.querySelector('a.start-room').onclick = () => {
    window.location.search = `?room=${random()}`
  }
}

const pickerComponent = funky`
${initPicker}
<rollcall-picker>
  <style>
    rollcall-picker a {
      margin: 0 5px;
      background: #66BEFB;
      padding: 5px 10px;
      font-size: 30px;
      font-weight: 600;
      color: #fff;
      border-radius: 3px;
      display: flex;
      width: fit-content;
      font-family: Lato,'Helvetica Neue',Arial,Helvetica;
      align-items: center;
      cursor: pointer;
    }
    rollcall-picker a:hover {
      background: #2B97E8;
    }
    rollcall-picker a img {
      height: 28px;
    }
    rollcall-picker a span {
      margin-left: 5px;
      margin-right: 5px;
    }
  </style>
  <a class="start-room">${bel([emojione.toImage('☎️')])}
     <span>Start Call</span>
     ${bel([emojione.toImage('☎️')])}
  </a>
  <div>
    content about about using roll call.
  </div>
</rollcall-picker>
`

if (opts.room) {
  let call = rollCall(opts)
  mainElement.appendChild(call)
} else {
  let picker = pickerComponent()
  mainElement.appendChild(picker)
}
