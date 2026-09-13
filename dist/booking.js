const bookingId=location.pathname.match(/^\/events\/([^/]+)\/?$/)?.[1];
const bookingEvent=events.find(event=>event.id===bookingId);
if(bookingEvent){
 document.body.classList.add('booking-page');
 document.title=bookingEvent.name+' — Registration | The Lucid’s Way';
 document.querySelector('#event-content').remove();
 document.querySelector('main').innerHTML=`<div class="album-toolbar"><a class="back-link" href="/#events">← All events</a><span>THE LUCID’S WAY / ${bookingEvent.name.toUpperCase()}</span><span>REGISTRATION</span></div><div class="booking-intro"><span class="eyebrow">MAKE A NIGHT OF IT</span><h1>Your next memory<br>starts <em>here.</em></h1></div><section id="event-content" aria-label="Event details and registration"></section><footer><a class="brand" href="/#home"><span class="logo-crop"><img src="/assets/lucids-way-logo.png" alt="The Lucid’s Way"></span></a><span>Good people. Great nights.</span><small>UI preview · No payments taken</small></footer>`;
 showEvent(bookingId,true);
 const content=document.querySelector('#event-content');
 content.querySelector('.close').remove();
 content.querySelector(':scope > .eyebrow').remove();
 const form=content.querySelector('form');
 form.insertAdjacentHTML('afterbegin','<div class="form-heading"><span class="eyebrow">SAVE YOUR SPOT</span><h2>Be part of the night.</h2><p>Choose a pass and add your details.</p></div>');
 for(const link of document.querySelectorAll('.menubar a,.dock a')){const href=link.getAttribute('href');if(href?.startsWith('#'))link.setAttribute('href','/'+href)}
 form.addEventListener('submit',()=>{content.querySelector('.close')?.remove();content.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})});
}
