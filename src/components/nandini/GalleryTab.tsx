import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Download, Heart, ImagePlus, Pencil, Play, RotateCcw, Trash2, Upload } from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { galleryAccept, galleryMediaInfo, galleryMediaKindFromPath, validateGalleryMediaBytes, type GalleryMediaKind } from "@/lib/galleryMedia";
import { uploadGalleryMediaResumable } from "@/lib/resumableGalleryUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Photo = { id: string; path: string; src: string; caption: string; createdAt: string; deletedAt: string | null; memoryDate?: string | null; favorite?: boolean; kind: GalleryMediaKind };
const BUCKET = "gallery";
const PAGE_SIZE = 24;

export default function GalleryTab() {
  const { session } = useAuth(); const uid = session?.user.id;
  const [photos,setPhotos]=useState<Photo[]>([]), [trash,setTrash]=useState<Photo[]>([]);
  const [open,setOpen]=useState<number|null>(null), [loaded,setLoaded]=useState(false), [busy,setBusy]=useState(false);
  const [error,setError]=useState(""), [notice,setNotice]=useState(""), [showTrash,setShowTrash]=useState(false);
  const [page,setPage]=useState(0), [hasMore,setHasMore]=useState(false);
  const [sort,setSort]=useState<"newest"|"oldest">("newest"), [favoritesOnly,setFavoritesOnly]=useState(false);
  const [uploadProgress,setUploadProgress]=useState<{done:number;total:number;currentPercent:number}|null>(null);
  const [storageStats,setStorageStats]=useState<{count:number;bytes:number}|null>(null);
  const [viewerDirection,setViewerDirection]=useState(0);
  const [editPhoto,setEditPhoto]=useState<Photo|null>(null),[editCaption,setEditCaption]=useState(""),[editDate,setEditDate]=useState("");

  async function signed(path:string) {
    const { data,error }=await supabase.storage.from(BUCKET).createSignedUrl(path,21600);
    if(error) throw error; return data.signedUrl;
  }
  async function loadStats(){
    if(!uid)return; let offset=0,count=0,bytes=0;
    while(true){const {data,error:e}=await supabase.storage.from(BUCKET).list(uid,{limit:1000,offset});if(e)return;const items=(data||[]).filter(o=>o.name&&o.name!==".emptyFolderPlaceholder");count+=items.length;bytes+=items.reduce((sum,o)=>sum+Number(o.metadata?.size||0),0);if((data||[]).length<1000)break;offset+=1000;}
    setStorageStats({count,bytes});
  }
  async function load(reset=true) {
    if(!uid) return;
    const nextPage=reset?0:page+1, from=nextPage*PAGE_SIZE, to=from+PAGE_SIZE-1;
    setBusy(true); setError("");
    try {
      const metaQuery=supabase.from("gallery_photos").select("id,path,caption,created_at,deleted_at,memory_date,is_favorite")
        .eq("user_id",uid).is("deleted_at",null);
      const filteredQuery=favoritesOnly?metaQuery.eq("is_favorite",true):metaQuery;
      const {data:meta,error:metaError}=await filteredQuery.order("created_at",{ascending:sort==="oldest"}).range(from,to);
      if(metaError) throw metaError;
      let rows=meta||[];
      // One-time compatibility for photos uploaded before gallery_photos existed.
      if(reset && !favoritesOnly && rows.length===0) {
        const {data:objects,error:listError}=await supabase.storage.from(BUCKET).list(uid,{limit:1000,sortBy:{column:"created_at",order:"desc"}});
        if(listError) throw listError;
        const legacy=(objects||[]).filter(o=>o.name&&o.name!==".emptyFolderPlaceholder").map(o=>({
          user_id:uid,path:`${uid}/${o.name}`,caption:String(o.metadata?.["caption"]||o.name.replace(/\.[^.]+$/,"")).slice(0,120),
          created_at:o.created_at||new Date().toISOString()
        }));
        if(legacy.length) {
          await supabase.from("gallery_photos").upsert(legacy,{onConflict:"path",ignoreDuplicates:true});
          const r=await supabase.from("gallery_photos").select("id,path,caption,created_at,deleted_at,memory_date,is_favorite").eq("user_id",uid).is("deleted_at",null).order("created_at",{ascending:false}).range(0,PAGE_SIZE-1);
          if(r.error) throw r.error; rows=r.data||[];
        }
      }
      const signedBatch=await supabase.storage.from(BUCKET).createSignedUrls(rows.map(r=>r.path),21600); if(signedBatch.error)throw signedBatch.error;
      const urls=new Map((signedBatch.data||[]).map(x=>[x.path,x.signedUrl]));
      const hydrated=rows.map(r=>({...r,createdAt:r.created_at,deletedAt:r.deleted_at,memoryDate:r.memory_date,favorite:r.is_favorite,src:urls.get(r.path)||"",kind:galleryMediaKindFromPath(r.path)}));
      setPhotos(cur=>reset?hydrated:[...cur,...hydrated]); setPage(nextPage); setHasMore(rows.length===PAGE_SIZE);
    } catch(e){setError(e instanceof Error?e.message:"Gallery could not be loaded.");} finally {setLoaded(true);setBusy(false);}
  }
  async function loadTrash(){
    if(!uid)return; setBusy(true);
    const {data,error:e}=await supabase.from("gallery_photos").select("id,path,caption,created_at,deleted_at,memory_date,is_favorite").eq("user_id",uid).not("deleted_at","is",null).order("deleted_at",{ascending:false});
    if(e)setError(e.message); else setTrash(await Promise.all((data||[]).map(async r=>({...r,createdAt:r.created_at,deletedAt:r.deleted_at,src:await signed(r.path),kind:galleryMediaKindFromPath(r.path)}))));
    setBusy(false);
  }
  useEffect(()=>{setPhotos([]);setTrash([]);setPage(0);setOpen(null);setLoaded(false);if(uid){void load(true);void loadStats();}else setLoaded(true);},[uid,sort,favoritesOnly]);

  async function upload(e:ChangeEvent<HTMLInputElement>){
    const files=Array.from(e.target.files||[]); e.target.value=""; if(!uid||!files.length||busy)return;
    if(files.length>10){setError("Please choose up to 10 photos or videos at a time.");return;} setBusy(true);setError("");setNotice("");
    try{
      const added:Photo[]=[];
      for(const file of files){
        const info=await validateGalleryMediaBytes(file), id=crypto.randomUUID(), path=`${uid}/${id}.${info.extension}`;
        const caption=(file.name.replace(/\.[^.]+$/,"").trim()||(info.kind==="video"?"Video":"Photo")).slice(0,120);
        setUploadProgress({done:added.length,total:files.length,currentPercent:0});
        await uploadGalleryMediaResumable({
          bucket:BUCKET,
          objectPath:path,
          file,
          contentType:info.contentType,
          onProgress:(uploaded,total)=>setUploadProgress({
            done:added.length,
            total:files.length,
            currentPercent:total?Math.round(uploaded/total*100):0,
          }),
        });
        const createdAt=new Date().toISOString();
        const db=await supabase.from("gallery_photos").insert({id,user_id:uid,path,caption,created_at:createdAt,updated_at:createdAt});
        if(db.error){await supabase.storage.from(BUCKET).remove([path]);throw db.error;}
        added.push({id,path,caption,createdAt,deletedAt:null,src:await signed(path),kind:info.kind});
        setUploadProgress({done:added.length,total:files.length,currentPercent:100});
      }
      setPhotos(cur=>[...added,...cur]);setNotice(added.length===1?"Added to Gallery.":`${added.length} items added to Gallery.`);void loadStats();
    }catch(x){setError(x instanceof Error?x.message:"Photos or videos could not be saved.");}finally{setBusy(false);setUploadProgress(null);}
  }
  async function downloadPhoto(photo:Photo){
    const ext=photo.path.split(".").pop()||"bin";
    const safeName=(photo.caption||"Gallery item").replace(/[\\/:*?"<>|]+/g,"-").slice(0,80);
    const {data,error:e}=await supabase.storage.from(BUCKET).createSignedUrl(photo.path,600,{download:`${safeName}.${ext}`});
    if(e){setError(e.message);return;}
    const a=document.createElement("a");a.href=data.signedUrl;a.download=`${safeName}.${ext}`;a.rel="noopener";document.body.appendChild(a);a.click();a.remove();
  }
  function beginEditPhoto(photo:Photo){setEditPhoto(photo);setEditCaption(photo.caption);setEditDate(photo.memoryDate||photo.createdAt.slice(0,10));}
  async function savePhotoDetails(){
    if(!uid||!editPhoto)return;const caption=(editCaption.trim()||(editPhoto.kind==="video"?"Video":"Photo")).slice(0,120),memoryDate=editDate||null;setBusy(true);
    const {error:e}=await supabase.from("gallery_photos").update({caption,memory_date:memoryDate,updated_at:new Date().toISOString()}).eq("id",editPhoto.id).eq("user_id",uid);
    if(e)setError(e.message);else{setPhotos(cur=>cur.map(p=>p.id===editPhoto.id?{...p,caption,memoryDate}:p));setEditPhoto(null);setNotice("Photo details updated.");}setBusy(false);
  }
  async function toggleFavorite(photo:Photo){
    if(!uid)return; const favorite=!photo.favorite;
    const {error:e}=await supabase.from("gallery_photos").update({is_favorite:favorite,updated_at:new Date().toISOString()}).eq("id",photo.id).eq("user_id",uid);
    if(e)setError(e.message);else setPhotos(cur=>cur.map(p=>p.id===photo.id?{...p,favorite}:p));
  }
  async function softDelete(photo:Photo){
    if(!uid||!confirm("Move this item to Recently Deleted?"))return;setBusy(true);
    const deletedAt=new Date().toISOString();const {error:e}=await supabase.from("gallery_photos").update({deleted_at:deletedAt,updated_at:deletedAt}).eq("id",photo.id).eq("user_id",uid);
    if(e)setError(e.message);else{setPhotos(cur=>cur.filter(p=>p.id!==photo.id));setOpen(null);setNotice("Moved to Recently Deleted.");}setBusy(false);
  }
  async function restore(photo:Photo){
    if(!uid)return;setBusy(true);const {error:e}=await supabase.from("gallery_photos").update({deleted_at:null,updated_at:new Date().toISOString()}).eq("id",photo.id).eq("user_id",uid);
    if(e)setError(e.message);else{setTrash(cur=>cur.filter(p=>p.id!==photo.id));await load(true);setNotice("Item restored.");}setBusy(false);
  }
  async function erase(photo:Photo){
    if(!uid||!confirm("Delete this item permanently? This cannot be undone."))return;setBusy(true);
    const d=await supabase.from("gallery_photos").delete().eq("id",photo.id).eq("user_id",uid);
    if(d.error)setError(d.error.message);else{setTrash(cur=>cur.filter(p=>p.id!==photo.id));const rm=await supabase.storage.from(BUCKET).remove([photo.path]);if(rm.error)setNotice("Item removed from the app; private storage cleanup can be retried later.");else{setNotice("Item permanently deleted.");void loadStats();}}setBusy(false);
  }

  const displayedPhotos=useMemo(()=>showTrash?trash:photos,[showTrash,trash,photos]);
  const selected=open===null?null:displayedPhotos[open];
  const goPrevious=()=>setOpen(i=>i===null?null:(i-1+displayedPhotos.length)%displayedPhotos.length);
  const goNext=()=>setOpen(i=>i===null?null:(i+1)%displayedPhotos.length);
  useEffect(()=>{if(open===null||displayedPhotos.length<2)return;[displayedPhotos[(open+1)%displayedPhotos.length],displayedPhotos[(open-1+displayedPhotos.length)%displayedPhotos.length]].forEach(p=>{if(p?.src&&p.kind==="image"){const img=new Image();img.src=p.src;}});},[open,displayedPhotos.length]);
  return <div className="space-y-4 pb-6">
    <div className="glass-pink space-y-3 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3"><div><h2 className="text-gradient text-xl font-bold">Your Gallery 📸</h2><p className="text-sm text-muted-foreground">Your photos, videos, and little moments.</p></div>
      <Button variant="ghost" size="sm" onClick={()=>{const n=!showTrash;setShowTrash(n);if(n)void loadTrash();}}>{showTrash?<ImagePlus size={15}/>:<Trash2 size={15}/>} {showTrash?"Gallery":"Deleted"}</Button></div>
      {!showTrash&&<><div className="flex gap-2 overflow-x-auto"><Button size="sm" variant={sort==="newest"?"default":"outline"} onClick={()=>setSort("newest")}>Newest</Button><Button size="sm" variant={sort==="oldest"?"default":"outline"} onClick={()=>setSort("oldest")}>Oldest</Button><Button size="sm" variant={favoritesOnly?"default":"outline"} onClick={()=>setFavoritesOnly(v=>!v)}><Heart size={14}/> Favorites</Button></div><input id="gallery-upload" aria-label="Choose photos or videos for your gallery" type="file" accept={galleryAccept} multiple onChange={upload} className="sr-only" disabled={busy||!uid}/>
      <Button asChild className="gradient-primary w-full rounded-xl"><label htmlFor="gallery-upload" className="cursor-pointer"><Upload size={16}/> Upload photos & videos</label></Button></>}
    </div>
    {error&&<p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {notice&&<p role="status" className="text-sm text-muted-foreground">{notice}</p>}
    {!showTrash&&storageStats&&<p className="text-center text-xs text-muted-foreground">{storageStats.count} items • {(storageStats.bytes/1024/1024).toFixed(storageStats.bytes>104857600?0:1)} MB</p>}
    {uploadProgress&&<div className="space-y-1"><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{width:`${Math.round(((uploadProgress.done+uploadProgress.currentPercent/100)/uploadProgress.total)*100)}%`}}/></div><p className="text-center text-xs text-muted-foreground">Uploading {Math.min(uploadProgress.done+1,uploadProgress.total)} of {uploadProgress.total} · {uploadProgress.currentPercent}%</p></div>}
    {!showTrash&&!loaded&&<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{Array.from({length:6}).map((_,i)=><div key={i} className="aspect-square animate-pulse rounded-2xl bg-muted/60"/>)}</div>}
    {!showTrash&&loaded&&photos.length===0&&<div className="glass-pink flex flex-col items-center gap-3 rounded-2xl px-6 py-12 text-center"><ImagePlus size={36}/><p>No photos or videos yet.</p></div>}
    {showTrash&&<p className="text-xs text-muted-foreground">Recently Deleted keeps gallery items recoverable until you permanently remove them.</p>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {displayedPhotos.map((photo,index)=><article key={photo.id} className="gallery-card glass-pink overflow-hidden rounded-2xl p-1.5">
        <button disabled={showTrash} onClick={()=>setOpen(index)} className="group w-full text-left">
          {photo.kind==="video"?<div className="relative aspect-square overflow-hidden rounded-xl bg-black"><video src={photo.src} aria-label={photo.caption} muted playsInline preload="metadata" className="h-full w-full object-cover"/><span className="pointer-events-none absolute inset-0 grid place-items-center"><span className="grid h-10 w-10 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm"><Play size={18} fill="currentColor"/></span></span></div>:<img src={photo.src} alt={photo.caption} loading="lazy" decoding="async" className="aspect-square w-full rounded-xl object-cover"/>}
        <div className="flex items-center gap-1 px-1 py-1.5"><p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{photo.caption}</p>{!showTrash&&<Heart size={13} className={photo.favorite?"fill-current text-primary":"text-muted-foreground"}/>}</div></button>
        {showTrash?<div className="grid grid-cols-2 gap-1"><Button variant="ghost" size="sm" onClick={()=>void restore(photo)}><RotateCcw size={13}/>Restore</Button><Button variant="ghost" size="sm" onClick={()=>void erase(photo)} className="text-destructive"><Trash2 size={13}/>Delete</Button></div>
        :<div className="grid grid-cols-4 gap-0.5"><Button variant="ghost" size="sm" title="Favorite" onClick={()=>void toggleFavorite(photo)}><Heart size={13}/></Button><Button variant="ghost" size="sm" title="Edit details" className="col-span-2" onClick={()=>beginEditPhoto(photo)}><Pencil size={13}/>Edit</Button><Button variant="ghost" size="sm" title="Remove" onClick={()=>void softDelete(photo)}><Trash2 size={13}/></Button></div>}
      </article>)}
    </div>
    {!showTrash&&hasMore&&<Button variant="outline" className="w-full" disabled={busy} onClick={()=>void load(false)}>{busy?"Loading…":"Load more"}</Button>}
    <Dialog open={!!editPhoto} onOpenChange={v=>{if(!v)setEditPhoto(null)}}><DialogContent className="rounded-3xl"><DialogTitle>Edit gallery item</DialogTitle><DialogDescription>Update the private caption and memory date.</DialogDescription><div className="space-y-3"><div><label className="text-sm font-medium">Caption</label><Input value={editCaption} maxLength={120} onChange={e=>setEditCaption(e.target.value)} className="mt-1"/></div><div><label className="text-sm font-medium">Memory date</label><Input type="date" value={editDate} onChange={e=>setEditDate(e.target.value)} className="mt-1"/></div><Button className="w-full" disabled={busy} onClick={()=>void savePhotoDetails()}>{busy?"Saving…":"Save changes"}</Button></div></DialogContent></Dialog>
    <Dialog open={!!selected} onOpenChange={v=>{if(!v)setOpen(null)}}><DialogContent className="h-[100dvh] w-screen max-w-none border-0 bg-black/95 p-0 text-white sm:h-[90dvh] sm:w-[min(94vw,900px)] sm:rounded-3xl">
      <DialogTitle className="sr-only">{selected?.caption||"Gallery item"}</DialogTitle><DialogDescription className="sr-only">View this private gallery item and browse nearby items.</DialogDescription>
      {selected&&<div className="flex h-full min-h-0 flex-col"><div className="flex items-center justify-between px-4 pb-2 pt-12 sm:pt-4"><div className="min-w-0"><p className="truncate text-sm font-medium">{selected.caption}</p><p className="text-xs text-white/55">{open===null?0:open+1} of {displayedPhotos.length}</p></div><div className="flex"><Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={()=>void toggleFavorite(selected)}><Heart size={18} className={selected.favorite?"fill-current":""}/></Button><Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={()=>void downloadPhoto(selected)}><Download size={18}/></Button></div></div>
      <div className="relative min-h-0 flex-1 overflow-hidden"><AnimatePresence initial={false} custom={viewerDirection}><motion.div key={selected.id} custom={viewerDirection} initial={{x:viewerDirection>=0?"45%":"-45%",opacity:.25}} animate={{x:0,opacity:1}} exit={{x:viewerDirection>=0?"-45%":"45%",opacity:.1}} transition={{type:"spring",stiffness:320,damping:34}} drag={selected.kind==="image"&&displayedPhotos.length>1?"x":false} dragConstraints={{left:0,right:0}} dragElastic={0.55} dragMomentum={false} onDragEnd={(_,info)=>{if(Math.abs(info.offset.x)>45||Math.abs(info.velocity.x)>300)info.offset.x<0?goNext():goPrevious();}} style={{touchAction:selected.kind==="image"?"pan-y":"auto"}} className="absolute inset-0 flex items-center justify-center px-2">{selected.kind==="video"?<video src={selected.src} controls autoPlay playsInline preload="metadata" className="max-h-full max-w-full object-contain"/>:<img src={selected.src} alt={selected.caption} draggable={false} className="pointer-events-none max-h-full max-w-full select-none object-contain"/>}</motion.div></AnimatePresence>
      {displayedPhotos.length>1&&<><Button variant="ghost" size="icon" aria-label="Previous photo" onClick={goPrevious} className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/35 text-white sm:inline-flex"><ChevronLeft/></Button><Button variant="ghost" size="icon" aria-label="Next photo" onClick={goNext} className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/35 text-white sm:inline-flex"><ChevronRight/></Button></>}</div>
      <p className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 text-center text-xs text-white/55">{selected.memoryDate?new Date(selected.memoryDate+"T12:00:00").toLocaleDateString("en-IN",{dateStyle:"medium"}):selected.kind==="video"?"Use the video controls to play or seek":"Swipe left or right to browse"}</p></div>}
    </DialogContent></Dialog>
  </div>;
}

