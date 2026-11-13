(function(){var c=window.SC_CONFIG||{};var els=document.querySelectorAll('[data-contact]');
for(var i=0;i<els.length;i++){var e=els[i];
if(c.CONTACT_EMAIL){e.innerHTML='';var a=document.createElement('a');a.href='mailto:'+c.CONTACT_EMAIL;a.textContent=c.CONTACT_EMAIL;e.appendChild(a);}}})();
