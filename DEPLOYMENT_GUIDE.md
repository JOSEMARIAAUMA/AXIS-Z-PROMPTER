# Guía de Despliegue: AXIS-Z Prompter

## 1. Configuración DNS (Ionos)

Para conectar el subdominio, añade el siguiente registro CNAME en tu panel de control de Ionos:

| Tipo | Host name (Subdominio) | Valor / Apunta a |
| :--- | :--- | :--- |
| **CNAME** | `prompter` | `cname.vercel-dns.com` |

> ⚠️ **Importante**: El dominio final será `prompter.axiszgpi.com`.

## 2. Despliegue en Vercel

Ejecuta el siguiente comando en tu terminal para desplegar a producción:

```bash
vercel --prod
```

Sigue las instrucciones en pantalla y asigna el dominio `prompter.axiszgpi.com` cuando se te solicite (o configúralo en el dashboard de Vercel).
