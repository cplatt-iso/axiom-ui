import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  Database, 
  Shield, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { 
  DashboardAnalyticsData, 
  RetentionEfficiencyData, 
  dashboardAnalyticsSchema, 
  retentionEfficiencySchema 
} from '@/schemas/logManagementSchema';

const StatisticsPage: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardAnalyticsData | null>(null);
  const [retentionData, setRetentionData] = useState<RetentionEfficiencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch enhanced dashboard analytics
      const dashboardResponse = await fetch('/api/v1/log-management/analytics/dashboard');
      if (!dashboardResponse.ok) {
        throw new Error(`Dashboard API error: ${dashboardResponse.status}`);
      }
      const dashboardJson = await dashboardResponse.json();
      const validatedDashboard = dashboardAnalyticsSchema.parse(dashboardJson);
      setDashboardData(validatedDashboard);

      // Fetch retention efficiency analytics
      const retentionResponse = await fetch('/api/v1/log-management/analytics/retention-efficiency');
      if (!retentionResponse.ok) {
        throw new Error(`Retention API error: ${retentionResponse.status}`);
      }
      const retentionJson = await retentionResponse.json();
      const validatedRetention = retentionEfficiencySchema.parse(retentionJson);
      setRetentionData(validatedRetention);

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading && !dashboardData) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Failed to load analytics: {error}</AlertDescription>
        </Alert>
        <Button onClick={fetchAnalytics} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!dashboardData || !retentionData) {
    return (
      <div className="p-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>No analytics data available</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Summary Cards Component
  const SummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dashboardData.storage.total_tb.toFixed(2)} TB</div>
          <p className="text-xs text-muted-foreground">
            Across {Object.keys(dashboardData.storage.by_tier || {}).length} storage tiers
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Daily Ingestion</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dashboardData.ingestion.daily_average_gb.toFixed(3)} GB</div>
          <p className="text-xs text-muted-foreground">
            {dashboardData.ingestion.total_documents_30d.toLocaleString()} docs (30d)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Compliance</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dashboardData.compliance.percentage.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">
            {dashboardData.compliance.compliant_indices}/{dashboardData.compliance.total_indices} indices
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Services</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dashboardData.services.total_services}</div>
          <p className="text-xs text-muted-foreground">
            Top: {(dashboardData.services.top_10 || [])[0]?.service || 'None'}
          </p>
        </CardContent>
      </Card>
    </div>
  );

  // Storage Distribution Tab
  const StorageTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Storage Distribution by Tier</CardTitle>
          <CardDescription>Current data distribution across hot, warm, cold, and archived tiers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(dashboardData.storage.by_tier || {}).map(([tier, data]) => (
            <div key={tier} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="capitalize font-medium">{tier}</span>
                <div className="text-right">
                  <div className="text-sm font-medium">{data.size_tb.toFixed(3)} TB</div>
                  <div className="text-xs text-muted-foreground">{data.percentage.toFixed(1)}%</div>
                </div>
              </div>
              <Progress value={data.percentage} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log Levels Distribution</CardTitle>
          <CardDescription>Distribution of log levels across all indexed data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(dashboardData.log_levels || {}).map(([level, data]) => (
            <div key={level} className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Badge variant={level === 'error' ? 'destructive' : level === 'warning' ? 'secondary' : 'outline'}>
                  {level.toUpperCase()}
                </Badge>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{data.count.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{data.percentage.toFixed(2)}%</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  // Ingestion Trends Tab
  const IngestionTab = () => {
    const recentTrends = (dashboardData.ingestion.trends || []).slice(-7);
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Ingestion Overview</CardTitle>
            <CardDescription>Daily ingestion patterns and document processing metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{dashboardData.ingestion.daily_average_gb.toFixed(3)} GB</div>
                <p className="text-sm text-muted-foreground">Daily Average</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{dashboardData.ingestion.total_documents_30d.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">Total Documents (30d)</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {recentTrends.length > 0 ? recentTrends[recentTrends.length - 1].avg_doc_size_bytes.toFixed(0) : 0} B
                </div>
                <p className="text-sm text-muted-foreground">Avg Doc Size</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Ingestion Trends (Last 7 Days)</CardTitle>
            <CardDescription>Document counts and storage metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTrends.map((trend) => (
                <div key={trend.date} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{trend.date}</div>
                    <div className="text-sm text-muted-foreground">
                      {trend.document_count.toLocaleString()} documents
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{trend.storage_gb.toFixed(3)} GB</div>
                    <div className="text-xs text-muted-foreground">
                      {trend.avg_doc_size_bytes.toFixed(0)} B/doc
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Compliance Tab
  const ComplianceTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Retention Compliance Overview</CardTitle>
          <CardDescription>Current compliance status and policy effectiveness</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Compliance Rate</span>
              <div className="text-right">
                <div className="text-lg font-semibold">{dashboardData.compliance.percentage.toFixed(1)}%</div>
                <Progress value={dashboardData.compliance.percentage} className="w-32 h-2" />
              </div>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-green-600">
                  {dashboardData.compliance.compliant_indices}
                </div>
                <p className="text-sm text-muted-foreground">Compliant</p>
              </div>
              <div>
                <div className="text-lg font-semibold text-red-600">
                  {dashboardData.compliance.non_compliant_indices}
                </div>
                <p className="text-sm text-muted-foreground">Non-Compliant</p>
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {dashboardData.compliance.total_indices}
                </div>
                <p className="text-sm text-muted-foreground">Total Indices</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Policy Efficiency</CardTitle>
          <CardDescription>Overall policy coverage and effectiveness metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Coverage</div>
                <div className="text-xl font-semibold">{dashboardData.policy_efficiency.coverage_percentage.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Efficiency Score</div>
                <div className="text-xl font-semibold">{dashboardData.policy_efficiency.efficiency_score.toFixed(1)}%</div>
              </div>
            </div>

            {(dashboardData.policy_efficiency.recommendations || []).length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Recommendations</h4>
                {dashboardData.policy_efficiency.recommendations.map((rec, index) => (
                  <Alert key={index}>
                    <Info className="h-4 w-4" />
                    <AlertDescription>{rec}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Services Tab
  const ServicesTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Top Services by Activity</CardTitle>
          <CardDescription>Services ranked by document count and storage usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(dashboardData.services.top_10 || []).map((service, index) => (
              <div key={service.service} className="flex justify-between items-center p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">#{index + 1}</Badge>
                  <div>
                    <div className="font-medium">{service.service}</div>
                    <div className="text-sm text-muted-foreground">
                      {service.index_count} {service.index_count === 1 ? 'index' : 'indices'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {service.document_count.toLocaleString()} docs ({service.document_percentage.toFixed(1)}%)
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {service.storage_gb.toFixed(3)} GB ({service.storage_percentage.toFixed(1)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Retention Efficiency Tab
  const RetentionEfficiencyTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Overall Efficiency</CardTitle>
          <CardDescription>System-wide retention policy effectiveness</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{retentionData.overall_efficiency.coverage_percentage.toFixed(1)}%</div>
              <p className="text-sm text-muted-foreground">Coverage</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{retentionData.overall_efficiency.total_policies}</div>
              <p className="text-sm text-muted-foreground">Total Policies</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{retentionData.overall_efficiency.active_policies}</div>
              <p className="text-sm text-muted-foreground">Active Policies</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{retentionData.overall_efficiency.uncovered_indices}</div>
              <p className="text-sm text-muted-foreground">Uncovered Indices</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Policy Breakdown</CardTitle>
          <CardDescription>Individual policy performance and coverage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(retentionData.policy_breakdown || []).map((policy) => (
              <div key={policy.policy_name} className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{policy.policy_name}</h4>
                    <Badge variant="outline" className="mt-1">{policy.tier}</Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      {policy.retention_days} days retention
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">{policy.efficiency_score.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">Efficiency</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <div className="font-medium">{policy.covered_indices}</div>
                    <p className="text-muted-foreground">Indices</p>
                  </div>
                  <div>
                    <div className="font-medium">{policy.covered_storage_gb.toFixed(2)} GB</div>
                    <p className="text-muted-foreground">Storage</p>
                  </div>
                  <div>
                    <div className="font-medium">{policy.covered_documents.toLocaleString()}</div>
                    <p className="text-muted-foreground">Documents</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Patterns:</p>
                  <div className="flex flex-wrap gap-1">
                    {(policy.patterns || []).map((pattern, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{pattern}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {(retentionData.improvement_opportunities || []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Improvement Opportunities</CardTitle>
            <CardDescription>Recommendations for optimizing retention policies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {retentionData.improvement_opportunities.map((opportunity, index) => (
                <Alert key={index}>
                  <BarChart3 className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium">{opportunity.type.replace('_', ' ').toUpperCase()}</div>
                    <div className="text-sm">{opportunity.description}</div>
                    <div className="text-xs text-muted-foreground">
                      Impact: {opportunity.impact} • Priority: {opportunity.priority}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Log Management Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive analytics and insights for log management system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            Updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <SummaryCards />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="ingestion">Ingestion</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Storage Efficiency</span>
                  <span className="font-medium">{dashboardData.policy_efficiency.efficiency_score.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Most Active Tier</span>
                  <span className="font-medium">
                    {Object.entries(dashboardData.storage.by_tier || {})
                      .sort((a, b) => b[1].percentage - a[1].percentage)[0]?.[0] || 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Top Log Level</span>
                  <span className="font-medium">
                    {Object.entries(dashboardData.log_levels || {})
                      .sort((a, b) => b[1].percentage - a[1].percentage)[0]?.[0]?.toUpperCase() || 'None'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Policy Coverage</span>
                  <div className="flex items-center gap-2">
                    {retentionData.overall_efficiency.coverage_percentage >= 90 ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="font-medium">{retentionData.overall_efficiency.coverage_percentage.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Active Policies</span>
                  <span className="font-medium">
                    {retentionData.overall_efficiency.active_policies}/{retentionData.overall_efficiency.total_policies}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Recommendations</span>
                  <Badge variant={retentionData.recommendations.length > 0 ? "secondary" : "outline"}>
                    {retentionData.recommendations.length}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="storage">
          <StorageTab />
        </TabsContent>

        <TabsContent value="ingestion">
          <IngestionTab />
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceTab />
        </TabsContent>

        <TabsContent value="services">
          <ServicesTab />
        </TabsContent>

        <TabsContent value="efficiency">
          <RetentionEfficiencyTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StatisticsPage;
