// Usage: node evidence/render-slides.cjs [playwright-module] [browser-executable] [QA-directory]
// Regenerates demo-slides.pdf from the editable HTML and checks text fit before export.
const {chromium}=require(process.argv[2]||'playwright');
const path=require('node:path'),fs=require('node:fs/promises'),{pathToFileURL}=require('node:url');
(async()=>{
  const root=path.resolve(__dirname,'..'),qa=process.argv[4];
  const browser=await chromium.launch({headless:true,...(process.argv[3]?{executablePath:process.argv[3]}:{})});
  try{
    const page=await browser.newPage({viewport:{width:1536,height:864},deviceScaleFactor:1});
    await page.goto(pathToFileURL(path.join(__dirname,'slide_cp5.html')).href,{waitUntil:'networkidle'});
    await page.evaluate(()=>document.fonts.ready);
    await page.emulateMedia({media:'print'});
    const report=await page.evaluate(()=>{
      const slides=[...document.querySelectorAll('.slide')];
      return {count:slides.length,fonts:[...document.fonts].map(f=>({family:f.family,status:f.status})),
        slides:slides.map((slide,i)=>{
          const bounds=slide.getBoundingClientRect(),footer=slide.querySelector('.slide-footer').getBoundingClientRect(),content=slide.querySelector('.content')||slide;
          const outside=[];
          for(const element of slide.querySelectorAll('h1,h2,h3,p,td,th,li,blockquote,.metric,.team,.checks')){
            const r=element.getBoundingClientRect();
            if(r.left<bounds.left||r.right>bounds.right+1||r.bottom>footer.top-10)outside.push(element.textContent.slice(0,80));
          }
          return {slide:i+1,width:bounds.width,height:bounds.height,overflow:content.scrollHeight>content.clientHeight+2,outside};
        })};
    });
    if(report.count!==6||report.slides.some(s=>s.overflow||s.outside.length))throw new Error(JSON.stringify(report,null,2));
    if(!report.fonts.some(f=>f.family==='"Plus Jakarta Sans"'&&f.status==='loaded')&&!report.fonts.some(f=>f.family==='Plus Jakarta Sans'&&f.status==='loaded'))throw new Error('Reference font did not load; check access to Google Fonts.');
    if(qa){await fs.mkdir(qa,{recursive:true});for(let i=0;i<6;i++)await page.locator('.slide').nth(i).screenshot({path:path.join(qa,`html-slide-${i+1}.png`)});await fs.writeFile(path.join(qa,'layout.json'),JSON.stringify(report,null,2));}
    await page.pdf({path:path.join(root,'demo-slides.pdf'),printBackground:true,preferCSSPageSize:true,displayHeaderFooter:false});
    console.log(JSON.stringify({output:path.join(root,'demo-slides.pdf'),slides:report.slides,referenceFontLoaded:true},null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
