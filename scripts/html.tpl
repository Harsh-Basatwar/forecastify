<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 20px; background-color: #f8fafc; color: #1e293b; }
      h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
      h2 { color: #334155; margin-top: 30px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 6px; overflow: hidden; }
      th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #e2e8f0; }
      th { background-color: #f1f5f9; font-weight: 600; color: #475569; }
      tr:hover { background-color: #f8fafc; }
      .severity-CRITICAL { background-color: #fee2e2; color: #991b1b; font-weight: bold; padding: 4px 8px; border-radius: 4px; display: inline-block; }
      .severity-HIGH { background-color: #ffedd5; color: #9a3412; font-weight: bold; padding: 4px 8px; border-radius: 4px; display: inline-block; }
      .severity-MEDIUM { background-color: #fef9c3; color: #854d0e; padding: 4px 8px; border-radius: 4px; display: inline-block; }
      .severity-LOW { background-color: #e0f2fe; color: #075985; padding: 4px 8px; border-radius: 4px; display: inline-block; }
    </style>
    <title>Trivy Vulnerability Report - Forecastify</title>
  </head>
  <body>
    <h1>🛡️ Forecastify DevSecOps — Trivy Vulnerability Scan Report</h1>
    {{- range . }}
    <h2>Target: {{ .Target }}</h2>
    {{- if .Vulnerabilities }}
    <table>
      <thead>
        <tr>
          <th>Package</th>
          <th>Vulnerability ID</th>
          <th>Severity</th>
          <th>Installed Version</th>
          <th>Fixed Version</th>
          <th>Title</th>
        </tr>
      </thead>
      <tbody>
        {{- range .Vulnerabilities }}
        <tr>
          <td><code>{{ .PkgName }}</code></td>
          <td><a href="{{ .PrimaryURL }}" target="_blank">{{ .VulnerabilityID }}</a></td>
          <td><span class="severity-{{ .Vulnerability.Severity }}">{{ .Vulnerability.Severity }}</span></td>
          <td>{{ .InstalledVersion }}</td>
          <td>{{ .FixedVersion }}</td>
          <td>{{ .Title }}</td>
        </tr>
        {{- end }}
      </tbody>
    </table>
    {{- else }}
    <p>✅ No vulnerabilities found for target {{ .Target }}.</p>
    {{- end }}
    {{- end }}
  </body>
</html>
