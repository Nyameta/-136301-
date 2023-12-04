package org.tensorflow.lite.examples.imageclassification;

import android.Manifest;
import android.annotation.TargetApi;
import android.content.pm.PackageManager;
import android.hardware.camera2.*;
import android.media.MediaRecorder;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.Surface;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.view.View;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Button;

import java.io.IOException;

public class CameraActivity extends AppCompatActivity {
    private boolean isRecording = false;
WebView webView;
    WebSettings webViewSettings;
    String TAG = "X";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_camera);
        webView = (WebView) findViewById(R.id.camera_activity);
        initAppSettings();
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_DENIED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA}, 100);
        }
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                Log.d(TAG, "onPermissionRequest");
                CameraActivity.this.runOnUiThread(new Runnable() {
                    @TargetApi(Build.VERSION_CODES.M)
                    @Override
                    public void run() {
                        Log.d(TAG, request.getOrigin().toString());
                        if(request.getOrigin().toString().equals("file:///")) {
                            Log.d(TAG, "GRANTED");
                            request.grant(request.getResources());
                        } else {
                            Log.d(TAG, "DENIED");
                            request.deny();
                        }
                    }
                });
            }
        });
    }
    public void initAppSettings(){
        webViewSettings = webView.getSettings();
        webViewSettings.setJavaScriptEnabled(true);
        webViewSettings.setAllowFileAccess(true);
        webViewSettings.setDatabaseEnabled(true);
        webViewSettings.setDomStorageEnabled(true);
        webViewSettings.setMediaPlaybackRequiresUserGesture(false);
        webViewSettings.setUserAgentString(getPackageName());
        webViewSettings.setAllowFileAccessFromFileURLs(true);
        webViewSettings.setAllowFileAccessFromFileURLs(true);
        webViewSettings.setAllowUniversalAccessFromFileURLs(true);
        webView.loadUrl("file:///android_asset/CameraActivityCanvas.html");
    }
}
