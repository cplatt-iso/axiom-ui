import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LogRetentionPoliciesPage from '@/pages/LogRetentionPoliciesPage';
import { ArchivalRulesPage } from './ArchivalRulesPage';
import StatisticsPage from './StatisticsPage';
import { HealthStatusPage } from './HealthStatusPage';

export function LogManagementLayout() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Log Management</h1>
                <p className="text-gray-600">
                    Manage log retention policies, archival rules, and storage optimization.
                </p>
            </div>

            <Tabs defaultValue="retention-policies" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="retention-policies">Retention Policies</TabsTrigger>
                    <TabsTrigger value="archival-rules">Archival Rules</TabsTrigger>
                    <TabsTrigger value="statistics">Statistics</TabsTrigger>
                    <TabsTrigger value="health-status">Health Status</TabsTrigger>
                </TabsList>

                <TabsContent value="retention-policies">
                    <LogRetentionPoliciesPage />
                </TabsContent>

                <TabsContent value="archival-rules">
                    <ArchivalRulesPage />
                </TabsContent>

                <TabsContent value="statistics">
                    <StatisticsPage />
                </TabsContent>

                <TabsContent value="health-status">
                    <HealthStatusPage />
                </TabsContent>
            </Tabs>
        </div>
    );
}
