// src/components/system-config/LoggingConfiguration.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
    SettingsIcon, 
    DatabaseIcon, 
    ServerIcon,
    CheckCircleIcon,
    XCircleIcon,
    SaveIcon,
    TestTubeIcon,
    ShieldCheckIcon,
    RefreshCwIcon
} from 'lucide-react';
import { 
    getSystemInfo, 
    saveLoggingConfig, 
    testElasticsearchConnection
} from '@/services/api';
import type { 
    LoggingConfig, 
    LoggingConfigResponse, 
    ElasticsearchConfig, 
    FluentdConfig
} from '@/schemas/loggingSchema';

const LoggingConfiguration: React.FC = () => {
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [elasticsearchEnabled, setElasticsearchEnabled] = useState(false);
    const [fluentdEnabled, setFluentdEnabled] = useState(false);
    const queryClient = useQueryClient();

    // Fetch system info to check current Elasticsearch status
    const { data: systemInfo, isLoading: systemInfoLoading } = useQuery({
        queryKey: ['system-info'],
        queryFn: getSystemInfo,
        refetchInterval: 30000,
    });

    // Debug log when systemInfo changes
    useEffect(() => {
        console.log('SystemInfo changed:', systemInfo, 'Loading:', systemInfoLoading);
    }, [systemInfo, systemInfoLoading]);

    // Default configurations that match backend schemas exactly
    const [elasticsearchConfig, setElasticsearchConfig] = useState<ElasticsearchConfig>({
        host: 'localhost',
        port: 9200,
        scheme: 'https',
        username: null,
        password: null,
        verify_certs: true,
        ca_cert_path: null,
        index_pattern: 'axiom-flow-*',
        timeout_seconds: 10,
        max_retries: 3,
    });

    const [fluentdConfig, setFluentdConfig] = useState<FluentdConfig>({
        host: '127.0.0.1',
        port: 24224,
        tag_prefix: 'axiom',
        retry_wait: 1,
        max_retries: 60,
        buffer_size: '10m',
    });

    // Update config from system info when available
    useEffect(() => {
        if (systemInfo) {
            console.log('Updating config from system info:', {
                elasticsearch_configured: systemInfo.elasticsearch_configured,
                elasticsearch_host: systemInfo.elasticsearch_host,
                elasticsearch_port: systemInfo.elasticsearch_port,
                elasticsearch_auth_enabled: systemInfo.elasticsearch_auth_enabled,
                elasticsearch_tls_enabled: systemInfo.elasticsearch_tls_enabled,
                elasticsearch_cert_verification: systemInfo.elasticsearch_cert_verification,
                elasticsearch_ca_cert_path: systemInfo.elasticsearch_ca_cert_path,
                elasticsearch_index_pattern: systemInfo.elasticsearch_index_pattern,
                fluentd_configured: systemInfo.fluentd_configured,
                fluentd_host: systemInfo.fluentd_host,
                fluentd_port: systemInfo.fluentd_port,
                fluentd_tag_prefix: systemInfo.fluentd_tag_prefix,
                fluentd_buffer_size: systemInfo.fluentd_buffer_size,
            });
            
            setElasticsearchEnabled(systemInfo.elasticsearch_configured || false);
            
            // Set Fluentd enabled state based on system info
            setFluentdEnabled(systemInfo.fluentd_configured || false);
            
            // Update the entire Elasticsearch config with all available system info
            setElasticsearchConfig(prev => ({
                ...prev,
                host: systemInfo.elasticsearch_host || prev.host,
                port: systemInfo.elasticsearch_port || prev.port,
                scheme: systemInfo.elasticsearch_tls_enabled ? 'https' : 'http',
                verify_certs: systemInfo.elasticsearch_cert_verification ?? prev.verify_certs,
                index_pattern: systemInfo.elasticsearch_index_pattern || prev.index_pattern,
                username: systemInfo.elasticsearch_username || prev.username,
                ca_cert_path: systemInfo.elasticsearch_ca_cert_path || prev.ca_cert_path,
                // Only update password if it's not masked (system usually returns null for security)
                password: systemInfo.elasticsearch_password && systemInfo.elasticsearch_password !== '********' 
                    ? systemInfo.elasticsearch_password 
                    : prev.password,
            }));

            // Update Fluentd config from system info
            if (systemInfo.fluentd_configured) {
                setFluentdConfig(prev => ({
                    ...prev,
                    host: systemInfo.fluentd_host || prev.host,
                    port: systemInfo.fluentd_port || prev.port,
                    tag_prefix: systemInfo.fluentd_tag_prefix || prev.tag_prefix,
                    buffer_size: systemInfo.fluentd_buffer_size || prev.buffer_size,
                }));
            }
        }
    }, [systemInfo]);

    // Update configuration mutation
    const updateConfigMutation = useMutation({
        mutationFn: (config: LoggingConfig) => saveLoggingConfig(config),
        onSuccess: (response: LoggingConfigResponse) => {
            queryClient.invalidateQueries({ queryKey: ['system-info'] });
            console.log('Configuration saved successfully:', response);
            if (response.restart_required) {
                // TODO: Show restart required notification
            }
        },
        onError: (error) => {
            console.error('Failed to save configuration:', error);
        },
    });

    const handleSave = () => {
        const config: LoggingConfig = {
            elasticsearch: elasticsearchConfig,
            // Fluentd configuration is read-only and managed at system level
            fluentd: null,
        };
        updateConfigMutation.mutate(config);
    };

    const testElasticsearchConnectionHandler = async () => {
        setIsTestingConnection(true);
        setTestResult(null);
        
        try {
            const result = await testElasticsearchConnection(elasticsearchConfig);
            setTestResult({ 
                success: result.status === 'success', 
                message: result.message 
            });
        } catch (error: any) {
            console.error('Elasticsearch connection test error:', error);
            
            // Handle specific backend errors
            let errorMessage = 'Connection test failed';
            if (error.message && error.message.includes('elasticsearch_client')) {
                errorMessage = 'Backend Elasticsearch service not properly initialized. Check server logs and restart the API service.';
            } else if (error.message && error.message.includes('503')) {
                errorMessage = 'Elasticsearch service unavailable. Check if Elasticsearch is running and accessible.';
            } else if (error.message && error.message.includes('401')) {
                errorMessage = 'Authentication failed. Check username and password.';
            } else if (error.message && error.message.includes('timeout')) {
                errorMessage = 'Connection timeout. Check host, port, and network connectivity.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            setTestResult({ 
                success: false, 
                message: errorMessage
            });
        } finally {
            setIsTestingConnection(false);
        }
    };

    const getConnectionStatus = () => {
        if (!systemInfo) return null;
        
        if (systemInfo.elasticsearch_configured) {
            return (
                <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
                    <CheckCircleIcon className="mr-1 h-3 w-3" />
                    Connected
                </Badge>
            );
        } else {
            return (
                <Badge variant="destructive">
                    <XCircleIcon className="mr-1 h-3 w-3" />
                    Not Connected
                </Badge>
            );
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <SettingsIcon className="h-6 w-6 text-blue-600" />
                            <div>
                                <CardTitle>Logging Configuration</CardTitle>
                                <CardDescription>
                                    Configure Elasticsearch and Fluentd settings for centralized logging of medical imaging workflows
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            {getConnectionStatus()}
                            <Button
                                onClick={handleSave}
                                disabled={updateConfigMutation.isPending}
                            >
                                <SaveIcon className="h-4 w-4 mr-2" />
                                Save Configuration
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Save Status */}
            {updateConfigMutation.isSuccess && (
                <Alert>
                    <CheckCircleIcon className="h-4 w-4" />
                    <AlertDescription>
                        Logging configuration saved successfully. Healthcare audit logging is now properly configured.
                    </AlertDescription>
                </Alert>
            )}

            {updateConfigMutation.isError && (
                <Alert variant="destructive">
                    <XCircleIcon className="h-4 w-4" />
                    <AlertDescription>
                        Failed to save logging configuration: {(updateConfigMutation.error as any)?.message || 'Unknown error'}
                    </AlertDescription>
                </Alert>
            )}

            {/* Test Connection Result */}
            {testResult && (
                <Alert variant={testResult.success ? "default" : "destructive"}>
                    {testResult.success ? (
                        <CheckCircleIcon className="h-4 w-4" />
                    ) : (
                        <XCircleIcon className="h-4 w-4" />
                    )}
                    <AlertDescription>
                        <div>{testResult.message}</div>
                        {!testResult.success && testResult.message.includes('elasticsearch_client') && (
                            <div className="mt-2 text-xs">
                                <strong>Technical Details:</strong> This indicates the backend Elasticsearch service failed to initialize. 
                                Check server logs for "ElasticsearchLogService" errors and restart the API service.
                            </div>
                        )}
                    </AlertDescription>
                </Alert>
            )}

            {/* Elasticsearch Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <DatabaseIcon className="mr-2 h-5 w-5" />
                        Elasticsearch Configuration
                    </CardTitle>
                    <CardDescription>
                        Configure secure connection to Elasticsearch for HIPAA-compliant log storage and medical audit trails
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Enable Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-base font-medium">Enable Elasticsearch Logging</Label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Store and search medical imaging system logs in Elasticsearch cluster
                            </p>
                        </div>
                        <Switch
                            checked={elasticsearchEnabled}
                            onCheckedChange={setElasticsearchEnabled}
                        />
                    </div>

                    <Separator />

                    {/* Connection Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="es-host">Host</Label>
                            <Input
                                id="es-host"
                                value={elasticsearchConfig.host}
                                onChange={(e) =>
                                    setElasticsearchConfig(prev => ({ ...prev, host: e.target.value }))
                                }
                                placeholder="elasticsearch.example.com"
                                disabled={!elasticsearchEnabled}
                            />
                        </div>
                        <div>
                            <Label htmlFor="es-port">Port</Label>
                            <Input
                                id="es-port"
                                type="number"
                                value={elasticsearchConfig.port}
                                onChange={(e) =>
                                    setElasticsearchConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 9200 }))
                                }
                                disabled={!elasticsearchEnabled}
                            />
                        </div>
                        <div>
                            <Label htmlFor="es-scheme">Scheme</Label>
                            <select
                                id="es-scheme"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={elasticsearchConfig.scheme}
                                onChange={(e) =>
                                    setElasticsearchConfig(prev => ({ ...prev, scheme: e.target.value as 'http' | 'https' }))
                                }
                                disabled={!elasticsearchEnabled}
                            >
                                <option value="https">HTTPS (Recommended for Production)</option>
                                <option value="http">HTTP (Development Only)</option>
                            </select>
                        </div>
                    </div>

                    {/* Authentication */}
                    <div>
                        <Label className="text-base font-medium flex items-center">
                            <ShieldCheckIcon className="mr-2 h-4 w-4" />
                            Authentication (Required for HIPAA Compliance)
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div>
                                <Label htmlFor="es-username">Username</Label>
                                <Input
                                    id="es-username"
                                    value={elasticsearchConfig.username || ''}
                                    onChange={(e) =>
                                        setElasticsearchConfig(prev => ({ ...prev, username: e.target.value || null }))
                                    }
                                    placeholder="elastic"
                                    disabled={!elasticsearchEnabled}
                                />
                            </div>
                            <div>
                                <Label htmlFor="es-password">Password</Label>
                                <Input
                                    id="es-password"
                                    type="password"
                                    value={elasticsearchConfig.password || ''}
                                    onChange={(e) =>
                                        setElasticsearchConfig(prev => ({ ...prev, password: e.target.value || null }))
                                    }
                                    placeholder={systemInfo?.elasticsearch_auth_enabled ? "Password loaded from system (masked)" : "Enter password"}
                                    disabled={!elasticsearchEnabled}
                                />
                            </div>
                        </div>
                    </div>

                    {/* SSL/TLS Settings */}
                    <div>
                        <Label className="text-base font-medium">SSL/TLS Settings (Required for Production)</Label>
                        <div className="mt-2 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Verify SSL Certificates</Label>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Always enabled in production for security compliance
                                    </p>
                                </div>
                                <Switch
                                    checked={elasticsearchConfig.verify_certs}
                                    onCheckedChange={(verify_certs) =>
                                        setElasticsearchConfig(prev => ({ ...prev, verify_certs }))
                                    }
                                    disabled={!elasticsearchEnabled}
                                />
                            </div>
                            
                            <div>
                                <Label htmlFor="es-ca-certs">CA Certificate Path (Optional)</Label>
                                <Input
                                    id="es-ca-certs"
                                    value={elasticsearchConfig.ca_cert_path || ''}
                                    onChange={(e) =>
                                        setElasticsearchConfig(prev => ({ ...prev, ca_cert_path: e.target.value || null }))
                                    }
                                    placeholder={systemInfo?.elasticsearch_ca_cert_path || "/path/to/ca.crt"}
                                    disabled={!elasticsearchEnabled}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Index and Performance Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="es-index-pattern">Index Pattern</Label>
                            <Input
                                id="es-index-pattern"
                                value={elasticsearchConfig.index_pattern}
                                onChange={(e) =>
                                    setElasticsearchConfig(prev => ({ ...prev, index_pattern: e.target.value }))
                                }
                                disabled={!elasticsearchEnabled}
                            />
                        </div>
                        <div>
                            <Label htmlFor="es-max-retries">Max Retries</Label>
                            <Input
                                id="es-max-retries"
                                type="number"
                                value={elasticsearchConfig.max_retries}
                                onChange={(e) =>
                                    setElasticsearchConfig(prev => ({ ...prev, max_retries: parseInt(e.target.value) || 3 }))
                                }
                                disabled={!elasticsearchEnabled}
                            />
                        </div>
                        <div>
                            <Label htmlFor="es-timeout">Timeout (seconds)</Label>
                            <Input
                                id="es-timeout"
                                type="number"
                                value={elasticsearchConfig.timeout_seconds}
                                onChange={(e) =>
                                    setElasticsearchConfig(prev => ({ ...prev, timeout_seconds: parseInt(e.target.value) || 10 }))
                                }
                                disabled={!elasticsearchEnabled}
                            />
                        </div>
                    </div>

                    {/* Test Connection Button */}
                    <div className="flex justify-start">
                        <Button
                            variant="outline"
                            onClick={testElasticsearchConnectionHandler}
                            disabled={!elasticsearchEnabled || isTestingConnection}
                        >
                            {isTestingConnection ? (
                                <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <TestTubeIcon className="mr-2 h-4 w-4" />
                            )}
                            Test Connection
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Fluentd Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <ServerIcon className="mr-2 h-5 w-5" />
                        Fluentd Configuration
                        <div className="ml-auto">
                            {fluentdEnabled ? (
                                <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
                                    <CheckCircleIcon className="mr-1 h-3 w-3" />
                                    Configured
                                </Badge>
                            ) : (
                                <Badge variant="secondary">
                                    Not Configured
                                </Badge>
                            )}
                        </div>
                    </CardTitle>
                    <CardDescription>
                        Fluentd configuration for medical imaging log forwarding and processing. These settings are configured at the system level.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Connection Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="fluentd-host">Host</Label>
                            <Input
                                id="fluentd-host"
                                value={fluentdConfig.host}
                                disabled
                                className="bg-gray-50 dark:bg-gray-800"
                            />
                        </div>
                        <div>
                            <Label htmlFor="fluentd-port">Port</Label>
                            <Input
                                id="fluentd-port"
                                type="number"
                                value={fluentdConfig.port}
                                disabled
                                className="bg-gray-50 dark:bg-gray-800"
                            />
                        </div>
                        <div>
                            <Label htmlFor="fluentd-tag-prefix">Tag Prefix</Label>
                            <Input
                                id="fluentd-tag-prefix"
                                value={fluentdConfig.tag_prefix}
                                disabled
                                className="bg-gray-50 dark:bg-gray-800"
                            />
                        </div>
                        <div>
                            <Label htmlFor="fluentd-buffer-size">Buffer Size</Label>
                            <Input
                                id="fluentd-buffer-size"
                                value={fluentdConfig.buffer_size}
                                disabled
                                className="bg-gray-50 dark:bg-gray-800"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default LoggingConfiguration;
