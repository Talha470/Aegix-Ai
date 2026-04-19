module.exports = {
  sqlPatterns: [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /\b(OR|AND)\b\s+\d+\s*=\s*\d+/i,
    /\bUNION\b.*\bSELECT\b/i,
    /\bSELECT\b.*\bFROM\b/i,
    /\bDROP\b\s+\bTABLE\b/i,
    /\bINSERT\b\s+\bINTO\b/i,
    /\bDELETE\b\s+\bFROM\b/i,
    /\bUPDATE\b.*\bSET\b/i,
  ],

  xssPatterns: [
    /<script.*?>.*?<\/script>/i,
    /javascript:/i,
    /onerror\s*=/i,
    /onload\s*=/i,
    /alert\s*\(/i,
    /document\.cookie/i,
    /<img.*?onerror.*?>/i,
    /<iframe.*?>/i,
  ],

  pathTraversalPatterns: [
    /\.\.\//i,
    /\.\.\\/i,
    /\/etc\/passwd/i,
    /\/proc\/self\/environ/i,
    /c:\\windows\\system32/i,
    /boot\.ini/i,
  ],

  suspiciousPatterns: [
    /\b(nmap|sqlmap|curl|wget|powershell|cmd\.exe)\b/i,
    /base64,/i,
    /\bpasswd\b/i,
    /\bshadow\b/i,
    /\/admin/i,
    /\/phpmyadmin/i,
    /\/wp-admin/i,
    /\/\.env/i,
  ],
};