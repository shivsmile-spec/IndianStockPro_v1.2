package com.shivsmile.indianstockpro;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;

    private static final String APP_URL = "https://shivsmile-spec.github.io/IndianStockPro_v1.2/";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        // Always fetch the current GitHub Pages version. This is important because
        // live_quotes.json is updated independently by GitHub Actions.
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        webView.clearCache(true);
        webView.clearHistory();
        webView.setWebViewClient(new WebViewClient());

        String freshUrl = APP_URL + "?app=android&v=20&t=" + System.currentTimeMillis();
        webView.loadUrl(freshUrl);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
