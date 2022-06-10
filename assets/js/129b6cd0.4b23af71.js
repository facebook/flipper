"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[6805],{3905:(e,t,n)=>{n.r(t),n.d(t,{MDXContext:()=>u,MDXProvider:()=>s,mdx:()=>v,useMDXComponents:()=>p,withMDXComponents:()=>d});var r=n(67294);function i(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function a(){return a=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(e[r]=n[r])}return e},a.apply(this,arguments)}function o(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function l(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?o(Object(n),!0).forEach((function(t){i(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):o(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function c(e,t){if(null==e)return{};var n,r,i=function(e,t){if(null==e)return{};var n,r,i={},a=Object.keys(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||(i[n]=e[n]);return i}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(i[n]=e[n])}return i}var u=r.createContext({}),d=function(e){return function(t){var n=p(t.components);return r.createElement(e,a({},t,{components:n}))}},p=function(e){var t=r.useContext(u),n=t;return e&&(n="function"==typeof e?e(t):l(l({},t),e)),n},s=function(e){var t=p(e.components);return r.createElement(u.Provider,{value:t},e.children)},m={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},f=r.forwardRef((function(e,t){var n=e.components,i=e.mdxType,a=e.originalType,o=e.parentName,u=c(e,["components","mdxType","originalType","parentName"]),d=p(n),s=i,f=d["".concat(o,".").concat(s)]||d[s]||m[s]||a;return n?r.createElement(f,l(l({ref:t},u),{},{components:n})):r.createElement(f,l({ref:t},u))}));function v(e,t){var n=arguments,i=t&&t.mdxType;if("string"==typeof e||i){var a=n.length,o=new Array(a);o[0]=f;var l={};for(var c in t)hasOwnProperty.call(t,c)&&(l[c]=t[c]);l.originalType=e,l.mdxType="string"==typeof e?e:i,o[1]=l;for(var u=2;u<a;u++)o[u]=n[u];return r.createElement.apply(null,o)}return r.createElement.apply(null,n)}f.displayName="MDXCreateElement"},39960:(e,t,n)=>{n.r(t),n.d(t,{default:()=>m});var r=n(80102),i=n(67294),a=n(73727),o=n(52263),l=n(13919),c=n(10412),u=(0,i.createContext)({collectLink:function(){}}),d=n(44996),p=n(18780),s=["isNavLink","to","href","activeClassName","isActive","data-noBrokenLinkCheck","autoAddBaseUrl"];const m=function(e){var t,n,m=e.isNavLink,f=e.to,v=e.href,h=e.activeClassName,g=e.isActive,b=e["data-noBrokenLinkCheck"],x=e.autoAddBaseUrl,y=void 0===x||x,w=(0,r.Z)(e,s),N=(0,o.default)().siteConfig,O=N.trailingSlash,k=N.baseUrl,C=(0,d.useBaseUrlUtils)().withBaseUrl,P=(0,i.useContext)(u),j=f||v,T=(0,l.Z)(j),D=null==j?void 0:j.replace("pathname://",""),E=void 0!==D?(n=D,y&&function(e){return e.startsWith("/")}(n)?C(n):n):void 0;E&&T&&(E=(0,p.applyTrailingSlash)(E,{trailingSlash:O,baseUrl:k}));var R=(0,i.useRef)(!1),U=m?a.OL:a.rU,B=c.default.canUseIntersectionObserver,M=(0,i.useRef)();(0,i.useEffect)((function(){return!B&&T&&null!=E&&window.docusaurus.prefetch(E),function(){B&&M.current&&M.current.disconnect()}}),[M,E,B,T]);var S=null!==(t=null==E?void 0:E.startsWith("#"))&&void 0!==t&&t,L=!E||!T||S;return E&&T&&!S&&!b&&P.collectLink(E),L?i.createElement("a",Object.assign({href:E},j&&!T&&{target:"_blank",rel:"noopener noreferrer"},w)):i.createElement(U,Object.assign({},w,{onMouseEnter:function(){R.current||null==E||(window.docusaurus.preload(E),R.current=!0)},innerRef:function(e){var t,n;B&&e&&T&&(t=e,n=function(){null!=E&&window.docusaurus.prefetch(E)},M.current=new window.IntersectionObserver((function(e){e.forEach((function(e){t===e.target&&(e.isIntersecting||e.intersectionRatio>0)&&(M.current.unobserve(t),M.current.disconnect(),n())}))})),M.current.observe(t))},to:E||""},m&&{isActive:g,activeClassName:h}))}},13919:(e,t,n)=>{function r(e){return!0===/^(\w*:|\/\/)/.test(e)}function i(e){return void 0!==e&&!r(e)}n.d(t,{b:()=>r,Z:()=>i})},44996:(e,t,n)=>{n.r(t),n.d(t,{useBaseUrlUtils:()=>a,default:()=>o});var r=n(52263),i=n(13919);function a(){var e=(0,r.default)().siteConfig,t=(e=void 0===e?{}:e).baseUrl,n=void 0===t?"/":t,a=e.url;return{withBaseUrl:function(e,t){return function(e,t,n,r){var a=void 0===r?{}:r,o=a.forcePrependBaseUrl,l=void 0!==o&&o,c=a.absolute,u=void 0!==c&&c;if(!n)return n;if(n.startsWith("#"))return n;if((0,i.b)(n))return n;if(l)return t+n;var d=n.startsWith(t)?n:t+n.replace(/^\//,"");return u?e+d:d}(a,n,e,t)}}}function o(e,t){return void 0===t&&(t={}),(0,a().withBaseUrl)(e,t)}},8802:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.default=function(e,t){var n=t.trailingSlash,r=t.baseUrl;if(e.startsWith("#"))return e;if(void 0===n)return e;var i,a=e.split(/[#?]/)[0],o="/"===a||a===r?a:(i=a,n?function(e){return e.endsWith("/")?e:e+"/"}(i):function(e){return e.endsWith("/")?e.slice(0,-1):e}(i));return e.replace(a,o)}},18780:function(e,t,n){var r=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.uniq=t.applyTrailingSlash=void 0;var i=n(8802);Object.defineProperty(t,"applyTrailingSlash",{enumerable:!0,get:function(){return r(i).default}});var a=n(29964);Object.defineProperty(t,"uniq",{enumerable:!0,get:function(){return r(a).default}})},29964:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.default=function(e){return Array.from(new Set(e))}},44277:(e,t,n)=>{n.r(t),n.d(t,{frontMatter:()=>u,contentTitle:()=>d,metadata:()=>p,toc:()=>s,default:()=>f});var r=n(83117),i=n(80102),a=(n(67294),n(3905)),o=n(44996),l=n(39960),c=["components"],u={id:"react-native",title:"Building a React Native Plugin"},d=void 0,p={unversionedId:"tutorial/react-native",id:"tutorial/react-native",isDocsHomePage:!1,title:"Building a React Native Plugin",description:"This section of the tutorial requires React Native 0.62 or higher.",source:"@site/../docs/tutorial/react-native.mdx",sourceDirName:"tutorial",slug:"/tutorial/react-native",permalink:"/docs/tutorial/react-native",editUrl:"https://github.com/facebook/flipper/blob/main/website/../docs/tutorial/react-native.mdx",tags:[],version:"current",frontMatter:{id:"react-native",title:"Building a React Native Plugin"},sidebar:"main",previous:{title:"Building an Android Plugin",permalink:"/docs/tutorial/android"},next:{title:"Building a JavaScript (Browser) Plugin",permalink:"/docs/tutorial/javascript"}},s=[],m={toc:s};function f(e){var t=e.components,n=(0,i.Z)(e,c);return(0,a.mdx)("wrapper",(0,r.Z)({},m,n,{components:t,mdxType:"MDXLayout"}),(0,a.mdx)("div",{className:"admonition admonition-caution alert alert--warning"},(0,a.mdx)("div",{parentName:"div",className:"admonition-heading"},(0,a.mdx)("h5",{parentName:"div"},(0,a.mdx)("span",{parentName:"h5",className:"admonition-icon"},(0,a.mdx)("svg",{parentName:"span",xmlns:"http://www.w3.org/2000/svg",width:"16",height:"16",viewBox:"0 0 16 16"},(0,a.mdx)("path",{parentName:"svg",fillRule:"evenodd",d:"M8.893 1.5c-.183-.31-.52-.5-.887-.5s-.703.19-.886.5L.138 13.499a.98.98 0 0 0 0 1.001c.193.31.53.501.886.501h13.964c.367 0 .704-.19.877-.5a1.03 1.03 0 0 0 .01-1.002L8.893 1.5zm.133 11.497H6.987v-2.003h2.039v2.003zm0-3.004H6.987V5.987h2.039v4.006z"}))),"caution")),(0,a.mdx)("div",{parentName:"div",className:"admonition-content"},(0,a.mdx)("p",{parentName:"div"},"This section of the tutorial requires React Native 0.62 or higher."))),(0,a.mdx)("p",null,"Once you've connected Flipper to a React Native application, writing your own Flipper plugin can be done without reaching into the native world."),(0,a.mdx)("p",null,"To expose Flipper to the JavaScript world, the React Native module ",(0,a.mdx)("inlineCode",{parentName:"p"},"react-native-flipper")," needs to be installed in the hosting application by running ",(0,a.mdx)("inlineCode",{parentName:"p"},"yarn add react-native-flipper")," and ",(0,a.mdx)("inlineCode",{parentName:"p"},"cd ios && pod install"),". If you are developing a plugin that is distributed as NPM package, make sure to add this to the installation instruction of your package as well!"),(0,a.mdx)("p",null,"Registering a new plugin is done by importing ",(0,a.mdx)("inlineCode",{parentName:"p"},"addPlugin")," from ",(0,a.mdx)("inlineCode",{parentName:"p"},"react-native-flipper")," and providing it an object that at least implements the method ",(0,a.mdx)("inlineCode",{parentName:"p"},"getId")," (the plugin id that should be used in the desktop plugin as well to make the connection) and two event handlers for the ",(0,a.mdx)("inlineCode",{parentName:"p"},"onConnect")," and ",(0,a.mdx)("inlineCode",{parentName:"p"},"onDisconnect")," events. The ",(0,a.mdx)("inlineCode",{parentName:"p"},"onConnect")," and ",(0,a.mdx)("inlineCode",{parentName:"p"},"onDisconnect")," events are triggered every time the plugin becomes (in)active in the Flipper desktop application. If the plugin is a ",(0,a.mdx)(l.default,{to:(0,o.default)("/docs/extending/create-plugin#background-plugins"),mdxType:"Link"},"background plugin"),", the events are triggered typically only once (they might be triggered never, if the Desktop user didn't enable the plugin, or multiple times if they enabled or disabled the plugin a few times)."),(0,a.mdx)("p",null,"The ",(0,a.mdx)("inlineCode",{parentName:"p"},"onConnect")," callback receive a ",(0,a.mdx)("inlineCode",{parentName:"p"},"connection")," which can be used to communicate with the backend:"),(0,a.mdx)("pre",null,(0,a.mdx)("code",{parentName:"pre",className:"language-javascript"},"import {addPlugin} from \"react-native-flipper\"\n\naddPlugin({\n  getId() {\n    return 'ReactNativeExamplePlugin';\n  },\n  onConnect(connection) {\n    mammmals.forEach(({ title, pictureUrl }, index) => {\n      connection.send('newRow', {\n          id: index,\n          title,\n          url: pictureUrl\n      })\n    })\n  },\n  onDisconnect() {\n  }\n})\n")),(0,a.mdx)("p",null,"You may want to store the connection somewhere to be able to send more events as long as ",(0,a.mdx)("inlineCode",{parentName:"p"},"onDisconnect")," event hasn't been fired."),(0,a.mdx)("p",null,"The ",(0,a.mdx)("inlineCode",{parentName:"p"},"connection")," object can also be used to listen to messages coming from the Desktop plugin. See ",(0,a.mdx)(l.default,{to:(0,o.default)("/docs/extending/create-plugin"),mdxType:"Link"},"Client Plugin API")," for details."),(0,a.mdx)("p",null,"An example plugin to play a little Tic-Tac-Toe between the Flipper Desktop and a React Native app can be found inside this repository as well (run ",(0,a.mdx)("inlineCode",{parentName:"p"},"yarn && yarn android")," in ",(0,a.mdx)("inlineCode",{parentName:"p"},"react-native/ReactNativeFlipperExample")," to start the test project):"),(0,a.mdx)("ul",null,(0,a.mdx)("li",{parentName:"ul"},"The React Native JavaScript based plugin implementation - ",(0,a.mdx)("a",{parentName:"li",href:"https://github.com/facebook/flipper/tree/main/react-native/ReactNativeFlipperExample/FlipperTicTacToe.js"},"FlipperTicTacToe.js")),(0,a.mdx)("li",{parentName:"ul"},"The Flipper Desktop plugin implementation - ",(0,a.mdx)("a",{parentName:"li",href:"https://github.com/facebook/flipper/blob/main/desktop/plugins/public/rn-tic-tac-toe/index.tsx"},"rn-tic-tac-toe/index.tsx"))))}f.isMDXComponent=!0}}]);