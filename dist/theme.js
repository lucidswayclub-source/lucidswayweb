// Set the theme before paint, including on directly opened memory pages.
(()=>{let preference;try{preference=localStorage.getItem('lucids-theme')}catch{}document.documentElement.dataset.theme=preference==='dark'||preference==='light'?preference:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'})();
