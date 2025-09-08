import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
    CheckCircle, 
    XCircle, 
    AlertTriangle, 
    Database,
    Server,
    Network,
    HardDrive,
    Clock,
    Activity,
    Zap,
    Shield
} from 'lucide-react';

interface HealthCheck {
    component: string;
    status: 'healthy' | 'warning' | 'critical' | 'unknown';
    message: string;
    lastCheck: string;
    responseTime?: number;
    details?: string;
}

export function HealthStatusPage() {
    // Mock health check data
    const healthChecks: HealthCheck[] = [
        {
            component: 'Elasticsearch Cluster',
            status: 'healthy',
            message: 'All nodes operational',
            lastCheck: '2025-01-05T10:30:00Z',
            responseTime: 45,
            details: '3 master nodes, 6 data nodes, green cluster status'
        },
        {
            component: 'Log Ingestion Pipeline',
            status: 'healthy',
            message: 'Processing normally',
            lastCheck: '2025-01-05T10:29:00Z',
            responseTime: 120,
            details: 'Throughput: 2.3 GB/hour, Queue depth: 42 messages'
        },
        {
            component: 'Retention Policy Engine',
            status: 'warning',
            message: 'High queue depth detected',
            lastCheck: '2025-01-05T10:28:00Z',
            responseTime: 230,
            details: 'Queue depth: 1,247 policies pending execution'
        },
        {
            component: 'Storage Backend',
            status: 'healthy',
            message: 'All storage tiers accessible',
            lastCheck: '2025-01-05T10:27:00Z',
            responseTime: 78,
            details: 'Hot: 98% available, Warm: 94% available, Cold: 99% available'
        },
        {
            component: 'Index Rotation Service',
            status: 'critical',
            message: 'Service unavailable',
            lastCheck: '2025-01-05T09:15:00Z',
            responseTime: undefined,
            details: 'Last successful rotation: 6 hours ago. Service restart required.'
        },
        {
            component: 'Archival Service',
            status: 'healthy',
            message: 'Archival jobs running normally',
            lastCheck: '2025-01-05T10:25:00Z',
            responseTime: 156,
            details: 'Active jobs: 3, Completed today: 12, Failed: 0'
        }
    ];

    const systemMetrics = {
        cpu: { usage: 67, status: 'normal' },
        memory: { usage: 84, status: 'warning' },
        disk: { usage: 73, status: 'normal' },
        network: { throughput: '2.1 GB/s', status: 'normal' }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'healthy':
                return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
            case 'warning':
                return <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
            case 'critical':
                return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
            default:
                return <AlertTriangle className="w-5 h-5 text-gray-400 dark:text-gray-500" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const colors = {
            healthy: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
            warning: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
            critical: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
            unknown: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20'
        } as const;
        
        return (
            <Badge className={colors[status as keyof typeof colors]}>
                {status.toUpperCase()}
            </Badge>
        );
    };

    const overallStatus = healthChecks.some(check => check.status === 'critical') ? 'critical' :
                         healthChecks.some(check => check.status === 'warning') ? 'warning' : 'healthy';

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">System Health Status</h2>
                <p className="text-muted-foreground">
                    Monitor the health and performance of log management components
                </p>
            </div>

            {/* Overall Status */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            {getStatusIcon(overallStatus)}
                            <div>
                                <CardTitle>Overall System Status</CardTitle>
                                <CardDescription>
                                    {overallStatus === 'healthy' ? 'All systems operational' :
                                     overallStatus === 'warning' ? 'Some components need attention' :
                                     'Critical issues detected'}
                                </CardDescription>
                            </div>
                        </div>
                        {getStatusBadge(overallStatus)}
                    </div>
                </CardHeader>
            </Card>

            {/* System Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                            <Zap className="w-4 h-4 text-orange-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{systemMetrics.cpu.usage}%</div>
                        <Progress 
                            value={systemMetrics.cpu.usage} 
                            className={`mt-2 ${systemMetrics.cpu.usage > 80 ? 'bg-red-100' : 'bg-gray-100'}`}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            {systemMetrics.cpu.status === 'normal' ? 'Normal' : 'High usage detected'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                            <Database className="w-4 h-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{systemMetrics.memory.usage}%</div>
                        <Progress 
                            value={systemMetrics.memory.usage} 
                            className="mt-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            {systemMetrics.memory.status === 'normal' ? 'Normal' : 'High usage detected'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
                            <HardDrive className="w-4 h-4 text-purple-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{systemMetrics.disk.usage}%</div>
                        <Progress 
                            value={systemMetrics.disk.usage} 
                            className="mt-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            {systemMetrics.disk.status === 'normal' ? 'Normal' : 'High usage detected'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">Network Throughput</CardTitle>
                            <Network className="w-4 h-4 text-green-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{systemMetrics.network.throughput}</div>
                        <p className="text-xs text-gray-600 mt-1">
                            Current network activity
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Component Health Checks */}
            <Card>
                <CardHeader>
                    <CardTitle>Component Health Checks</CardTitle>
                    <CardDescription>
                        Detailed status of individual log management components
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {healthChecks.map((check, index) => (
                            <div 
                                key={index}
                                className={`p-4 rounded-lg border transition-colors ${
                                    check.status === 'critical' ? 'border-red-500/20 bg-red-500/10 dark:border-red-500/30 dark:bg-red-500/20' :
                                    check.status === 'warning' ? 'border-yellow-500/20 bg-yellow-500/10 dark:border-yellow-500/30 dark:bg-yellow-500/20' :
                                    'border-green-500/20 bg-green-500/10 dark:border-green-500/30 dark:bg-green-500/20'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-3">
                                        {getStatusIcon(check.status)}
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3">
                                                <h4 className="font-medium">{check.component}</h4>
                                                {getStatusBadge(check.status)}
                                                {check.responseTime && (
                                                    <Badge variant="outline" className="text-xs">
                                                        <Clock className="w-3 h-3 mr-1" />
                                                        {check.responseTime}ms
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">{check.message}</p>
                                            {check.details && (
                                                <p className="text-xs text-muted-foreground/70 mt-2">{check.details}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right text-xs text-muted-foreground/70">
                                        Last checked: {new Date(check.lastCheck).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Service Dependencies */}
            <Card>
                <CardHeader>
                    <CardTitle>Service Dependencies</CardTitle>
                    <CardDescription>External dependencies and their current status</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <Server className="w-5 h-5 text-green-600" />
                                <div>
                                    <div className="font-medium">Elasticsearch</div>
                                    <div className="text-sm text-gray-600">v8.11.3</div>
                                </div>
                            </div>
                            <Badge className="bg-green-100 text-green-800">UP</Badge>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <Database className="w-5 h-5 text-green-600" />
                                <div>
                                    <div className="font-medium">Redis Cache</div>
                                    <div className="text-sm text-gray-600">v7.2.0</div>
                                </div>
                            </div>
                            <Badge className="bg-green-100 text-green-800">UP</Badge>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <Shield className="w-5 h-5 text-green-600" />
                                <div>
                                    <div className="font-medium">Auth Service</div>
                                    <div className="text-sm text-gray-600">OAuth 2.0</div>
                                </div>
                            </div>
                            <Badge className="bg-green-100 text-green-800">UP</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Alerts */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Alerts</CardTitle>
                    <CardDescription>Latest system alerts and warnings</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <XCircle className="w-4 h-4 text-red-600" />
                                <div>
                                    <div className="font-medium">Index rotation service failed</div>
                                    <div className="text-sm text-gray-600">Service health check timeout</div>
                                </div>
                            </div>
                            <span className="text-xs text-gray-500">15 minutes ago</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                <div>
                                    <div className="font-medium">High memory usage detected</div>
                                    <div className="text-sm text-gray-600">Memory usage exceeded 80% threshold</div>
                                </div>
                            </div>
                            <span className="text-xs text-gray-500">1 hour ago</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <Activity className="w-4 h-4 text-blue-600" />
                                <div>
                                    <div className="font-medium">Daily archival completed</div>
                                    <div className="text-sm text-gray-600">Successfully archived 47.2 GB of logs</div>
                                </div>
                            </div>
                            <span className="text-xs text-gray-500">2 hours ago</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
