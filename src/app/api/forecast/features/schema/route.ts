import { FeatureEngineeringPipeline } from "@/lib/forecast/features";

export async function GET() {
  try {
    const pipeline = new FeatureEngineeringPipeline();
    const registry = pipeline.getRegistry();
    const builders = registry.getAllBuilders().map((b) => ({
      name: b.name,
      version: b.version,
      stage: b.stage,
      dependencies: b.dependencies,
      compatibility: b.compatibility,
    }));

    return Response.json({
      success: true,
      schemaVersion: "2.0.0",
      builderVersion: "2.0.0",
      normalizationVersion: "1.0.0",
      activeBuilders: builders,
      supportedNormalizationMethods: ["Identity", "MinMax", "ZScore", "RobustScaler"],
    });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to fetch feature schema" }, { status: 500 });
  }
}
