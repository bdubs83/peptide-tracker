package com.retaunfiltered.innercircle;

import android.os.Bundle;

import androidx.activity.result.ActivityResultLauncher;
import androidx.health.connect.client.PermissionController;

import com.getcapacitor.BridgeActivity;

import java.util.Set;

public class MainActivity extends BridgeActivity {
    private ActivityResultLauncher<Set<String>> healthConnectPermissionLauncher;
    private HealthConnectPlugin healthConnectPlugin;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Capacitor builds its plugin registry during BridgeActivity.onCreate, so custom
        // plugins must be registered before calling through to the parent activity.
        registerPlugin(HealthConnectPlugin.class);
        super.onCreate(savedInstanceState);
        healthConnectPermissionLauncher = registerForActivityResult(
            PermissionController.createRequestPermissionResultContract(),
            grantedPermissions -> {
                if (healthConnectPlugin != null) {
                    healthConnectPlugin.onPermissionsResult(grantedPermissions);
                }
            }
        );
    }

    public void requestHealthConnectPermissions(Set<String> permissions, HealthConnectPlugin plugin) {
        healthConnectPlugin = plugin;
        healthConnectPermissionLauncher.launch(permissions);
    }
}
