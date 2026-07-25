package com.retaunfiltered.innercircle;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;

public class PermissionsRationaleActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView webView = new WebView(this);
        webView.getSettings().setJavaScriptEnabled(false);
        webView.loadUrl("file:///android_asset/public/privacy-policy.html");
        setContentView(webView);
    }
}
