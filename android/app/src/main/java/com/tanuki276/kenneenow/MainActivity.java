package com.tanuki276.kenneenow;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Locale;

public class MainActivity extends Activity {
  private WebView web;
  private ValueCallback<Uri[]> pendingFile;
  private final Handler main = new Handler(Looper.getMainLooper());
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    getWindow().setStatusBarColor(Color.rgb(10,16,31));
    getWindow().setNavigationBarColor(Color.rgb(10,16,31));
    web=new WebView(this);
    web.setBackgroundColor(Color.rgb(13,19,35));
    web.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
    setContentView(web);
    WebSettings s=web.getSettings();
    s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true);
    s.setAllowFileAccess(false); s.setAllowContentAccess(true);
    s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    web.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT,true);
    web.addJavascriptInterface(new AndroidBridge(),"Android");
    web.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
        Uri u=req.getUrl();
        return !("https".equals(u.getScheme()) && "appassets.androidplatform.net".equals(u.getHost()));
      }
      @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest req) {
        Uri u=req.getUrl();
        if(!"https".equals(u.getScheme()) || !"appassets.androidplatform.net".equals(u.getHost()))return null;
        String path=cleanPath(u.getPath());
        if(path==null)return new WebResourceResponse("text/plain","UTF-8",403,"Forbidden",new HashMap<>(),new ByteArrayInputStream(new byte[0]));
        try {
          InputStream stream=getAssets().open(path);
          HashMap<String,String> headers=new HashMap<>();
          headers.put("Access-Control-Allow-Origin","*");
          headers.put("Cache-Control","no-store");
          return new WebResourceResponse(mime(path),"UTF-8",200,"OK",headers,stream);
        }catch(Exception e){return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",new HashMap<>(),new ByteArrayInputStream(new byte[0]));}
      }
    });
    web.setWebChromeClient(new WebChromeClient(){
      @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> cb,FileChooserParams p) {
        if(pendingFile!=null)pendingFile.onReceiveValue(null);
        pendingFile=cb;
        Intent pick=new Intent(Intent.ACTION_GET_CONTENT);
        pick.setType("*/*");pick.addCategory(Intent.CATEGORY_OPENABLE);
        startActivityForResult(Intent.createChooser(pick,"GLBファイルを選択"),700);
        return true;
      }
    });
    web.loadUrl("https://appassets.androidplatform.net/index.html");
  }
  private static String cleanPath(String input) {
    if(input==null || input.equals("/"))return "index.html";
    String path=input.startsWith("/")?input.substring(1):input;
    return path.contains("..") || path.contains("\\") || path.startsWith("/")?null:path;
  }
  private static String mime(String f) {
    if(f.endsWith(".html"))return "text/html";
    if(f.endsWith(".js"))return "text/javascript";
    if(f.endsWith(".css"))return "text/css";
    if(f.endsWith(".json"))return "application/json";
    if(f.endsWith(".glb"))return "model/gltf-binary";
    if(f.endsWith(".svg"))return "image/svg+xml";
    return "application/octet-stream";
  }
  private void toast(String msg){main.post(()->Toast.makeText(this,msg,Toast.LENGTH_LONG).show());}
  private static String name(String n,String suffix){
    if(n==null)n="model"+suffix;
    n=n.replaceAll("[^a-zA-Z0-9._-]","_");
    if(!n.toLowerCase(Locale.ROOT).endsWith(suffix))n+=suffix;
    return n.length()>100?n.substring(n.length()-100):n;
  }
  private void save(InputStream input,String filename,String type,boolean downloads) throws Exception {
    Uri folder=downloads?MediaStore.Downloads.EXTERNAL_CONTENT_URI:MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
    ContentValues values=new ContentValues();
    values.put(MediaStore.MediaColumns.DISPLAY_NAME,filename);
    values.put(MediaStore.MediaColumns.MIME_TYPE,type);
    values.put(MediaStore.MediaColumns.RELATIVE_PATH,(downloads?Environment.DIRECTORY_DOWNLOADS:Environment.DIRECTORY_PICTURES)+"/AstralArchive");
    values.put(MediaStore.MediaColumns.IS_PENDING,1);
    Uri uri=getContentResolver().insert(folder,values);
    if(uri==null)throw new Exception("Cannot create output");
    boolean success=false;
    try(InputStream in=input;OutputStream out=getContentResolver().openOutputStream(uri)){
      if(out==null)throw new Exception("Cannot open output");
      byte[] bytes=new byte[65536];int n;
      while((n=in.read(bytes))!=-1)out.write(bytes,0,n);
      success=true;
    }finally{
      if(success){ContentValues done=new ContentValues();done.put(MediaStore.MediaColumns.IS_PENDING,0);getContentResolver().update(uri,done,null,null);}
      else getContentResolver().delete(uri,null,null);
    }
  }
  public final class AndroidBridge {
    @JavascriptInterface public void saveAsset(String path,String filename){
      if(path==null||!path.startsWith("/models/")||!path.endsWith(".glb"))return;
      String source=cleanPath(path);if(source==null)return;
      String result=name(filename,".glb");
      new Thread(()->{try{save(getAssets().open(source),result,"model/gltf-binary",true);toast("GLBを保存しました");}
      catch(Exception e){toast("GLB保存エラー");}}).start();
    }
    @JavascriptInterface public void saveScreenshot(String url,String filename){
      if(url==null||!url.startsWith("data:image/png;base64,")||url.length()>32000000)return;
      new Thread(()->{try{
        byte[] image=Base64.decode(url.substring(22),Base64.DEFAULT);
        save(new ByteArrayInputStream(image),name(filename,".png"),"image/png",false);
        toast("画像を保存しました");
      }catch(Exception e){toast("画像保存エラー");}}).start();
    }
  }
  @Override protected void onActivityResult(int code,int result,Intent data){
    super.onActivityResult(code,result,data);
    if(code==700&&pendingFile!=null){pendingFile.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));pendingFile=null;}
  }
  @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else super.onBackPressed();}
  @Override protected void onDestroy(){if(pendingFile!=null)pendingFile.onReceiveValue(null);if(web!=null){web.removeJavascriptInterface("Android");web.destroy();}super.onDestroy();}
}
