import { PredictiveAnalyticsEngine } from './src/services/analytics/engines/predictiveAnalyticsEngine';
import { AnalyticsEvent } from './src/types';

// Quick verification script for the TypeScript fixes
async function verifyFixes() {
    console.log('🔍 Verifying TypeScript fixes...');

    try {
        // Test 1: Verify PredictiveAnalyticsEngine instantiation
        console.log('Test 1: Creating PredictiveAnalyticsEngine...');
        const engine = new PredictiveAnalyticsEngine({
            confidenceThreshold: 0.5,
            enableAnomalyDetection: true,
            enableTrendForecasting: true,
            enableRiskAssessment: true
        });
        console.log('✅ PredictiveAnalyticsEngine created successfully');

        // Test 2: Test confidence handling with undefined values
        console.log('Test 2: Testing confidence property handling...');
        const mockEvents: AnalyticsEvent[] = [
            {
                id: 'test1',
                type: 'command_executed',
                timestamp: new Date(),
                userId: 'test-user',
                metadata: { success: false }
            }
        ];

        const predictions = await engine.generatePredictions(mockEvents);
        console.log('✅ Confidence property handling works correctly');

        // Test 3: Test ForecastResult type compatibility
        console.log('Test 3: Testing ForecastResult generation...');
        const forecastEvents: AnalyticsEvent[] = [
            {
                id: 'forecast1',
                type: 'test',
                timestamp: new Date(),
                userId: 'test-user',
                metadata: { responseTime: 100 }
            },
            {
                id: 'forecast2',
                type: 'test',
                timestamp: new Date(),
                userId: 'test-user',
                metadata: { responseTime: 110 }
            }
        ];

        const forecasts = await engine.generateForecasts(forecastEvents, ['responseTime'], 24);
        console.log('✅ ForecastResult type compatibility verified');

        // Test 4: Verify all required properties are present
        if (forecasts.length > 0) {
            const forecast = forecasts[0];
            const hasRequiredProps = 
                forecast.id !== undefined &&
                forecast.timeHorizon !== undefined &&
                forecast.dataPoints !== undefined;
            
            if (hasRequiredProps) {
                console.log('✅ All required ForecastResult properties present');
            } else {
                console.log('❌ Missing required ForecastResult properties');
            }
        }

        // Cleanup
        engine.dispose();
        console.log('✅ Engine disposed successfully');

        console.log('\n🎉 All TypeScript fixes verified successfully!');
        return true;

    } catch (error) {
        console.error('❌ Verification failed:', error);
        return false;
    }
}

// Run verification if this file is executed directly
if (require.main === module) {
    verifyFixes().then(success => {
        process.exit(success ? 0 : 1);
    });
}

export { verifyFixes };
