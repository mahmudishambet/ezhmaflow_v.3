const si = require('systeminformation');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

let previousNetworkData = null;
let previousTimestamp = null;

async function getSystemStats() {
  try {
    const [cpuData, memData, networkData, diskData, additionalDisk] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.networkStats(),
      getDiskUsage(),
      getAdditionalDiskUsage()
    ]);
    
    const cpuUsage = cpuData.currentLoad || cpuData.avg || 0;
    
    const networkSpeed = calculateNetworkSpeed(networkData);
    
    const formatMemory = (bytes) => {
      if (bytes >= 1073741824) {
        return (bytes / 1073741824).toFixed(2) + " GB";
      } else {
        return (bytes / 1048576).toFixed(2) + " MB";
      }
    };
    
    return {
      cpu: {
        usage: Math.round(cpuUsage),
        cores: cpuData.cpus ? cpuData.cpus.length : 0
      },
      memory: {
        total: formatMemory(memData.total),
        used: formatMemory(memData.active),
        free: formatMemory(memData.available),
        usagePercent: Math.round((memData.active / memData.total) * 100)
      },
      network: networkSpeed,
      disk: diskData,
      additionalDiskStatus: additionalDisk.status,
      additionalDiskPath: additionalDisk.path,
      additionalDiskUsed: additionalDisk.used,
      additionalDiskTotal: additionalDisk.total,
      additionalDiskPercent: additionalDisk.percent,
      platform: process.platform,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error getting system stats:', error);
    return {
      cpu: { usage: 0, cores: 0 },
      memory: { total: "0 GB", used: "0 GB", free: "0 GB", usagePercent: 0 },
      network: { download: 0, upload: 0, downloadFormatted: '0 Mbps', uploadFormatted: '0 Mbps' },
      disk: { total: "0 GB", used: "0 GB", free: "0 GB", usagePercent: 0, drive: "N/A" },
      additionalDiskStatus: "Unavailable",
      additionalDiskPath: "",
      additionalDiskUsed: "0 GB",
      additionalDiskTotal: "0 GB",
      additionalDiskPercent: 0,
      platform: process.platform,
      timestamp: Date.now()
    };
  }
}

function calculateNetworkSpeed(networkData) {
  const currentTimestamp = Date.now();
  
  if (!previousNetworkData || !previousTimestamp) {
    previousNetworkData = networkData;
    previousTimestamp = currentTimestamp;
    return {
      download: 0,
      upload: 0,
      downloadFormatted: '0 Mbps',
      uploadFormatted: '0 Mbps'
    };
  }
  
  const timeDiff = (currentTimestamp - previousTimestamp) / 1000;
  
  const currentTotal = networkData
    .filter(iface => !iface.iface.includes('lo') && !iface.iface.includes('Loopback'))
    .reduce((acc, iface) => ({
      rx_bytes: acc.rx_bytes + (iface.rx_bytes || 0),
      tx_bytes: acc.tx_bytes + (iface.tx_bytes || 0)
    }), { rx_bytes: 0, tx_bytes: 0 });
  
  const previousTotal = previousNetworkData
    .filter(iface => !iface.iface.includes('lo') && !iface.iface.includes('Loopback'))
    .reduce((acc, iface) => ({
      rx_bytes: acc.rx_bytes + (iface.rx_bytes || 0),
      tx_bytes: acc.tx_bytes + (iface.tx_bytes || 0)
    }), { rx_bytes: 0, tx_bytes: 0 });
  
  const downloadBps = Math.max(0, (currentTotal.rx_bytes - previousTotal.rx_bytes) / timeDiff);
  const uploadBps = Math.max(0, (currentTotal.tx_bytes - previousTotal.tx_bytes) / timeDiff);
  
  const downloadMbps = (downloadBps * 8) / (1024 * 1024);
  const uploadMbps = (uploadBps * 8) / (1024 * 1024);
  
  previousNetworkData = networkData;
  previousTimestamp = currentTimestamp;
  
  return {
    download: downloadMbps,
    upload: uploadMbps,
    downloadFormatted: formatSpeed(downloadMbps),
    uploadFormatted: formatSpeed(uploadMbps)
  };
}

function formatSpeed(speedMbps) {
  if (speedMbps >= 1000) {
    return (speedMbps / 1000).toFixed(2) + ' Gbps';
  } else if (speedMbps >= 1) {
    return speedMbps.toFixed(2) + ' Mbps';
  } else {
    return (speedMbps * 1000).toFixed(0) + ' Kbps';
  }
}

async function getDiskUsage() {
  try {
    const fsSize = await si.fsSize();
    const platform = process.platform;
    
    let targetDisk;
    
    if (platform === 'win32') {
      const currentDrive = process.cwd().charAt(0).toUpperCase();
      targetDisk = fsSize.find(disk => disk.mount.charAt(0).toUpperCase() === currentDrive);
      
      if (!targetDisk) {
        targetDisk = fsSize.find(disk => disk.mount.charAt(0).toUpperCase() === 'C');
      }
    } else {
      targetDisk = fsSize.find(disk => disk.mount === '/');
    }
    
    if (!targetDisk) {
      targetDisk = fsSize[0];
    }
    
    if (!targetDisk) {
      return {
        total: "0 GB",
        used: "0 GB", 
        free: "0 GB",
        usagePercent: 0,
        drive: "N/A"
      };
    }
    
    const formatDisk = (bytes) => {
      if (bytes >= 1099511627776) {
        return (bytes / 1099511627776).toFixed(2) + " TB";
      } else if (bytes >= 1073741824) {
        return (bytes / 1073741824).toFixed(2) + " GB";
      } else {
        return (bytes / 1048576).toFixed(2) + " MB";
      }
    };
    
    const usagePercent = targetDisk.size > 0 ? 
      Math.round(((targetDisk.size - targetDisk.available) / targetDisk.size) * 100) : 0;
    
    return {
      total: formatDisk(targetDisk.size),
      used: formatDisk(targetDisk.size - targetDisk.available),
      free: formatDisk(targetDisk.available),
      usagePercent: usagePercent,
      drive: targetDisk.mount || targetDisk.fs || "Unknown"
    };
  } catch (error) {
    console.error('Error getting disk usage:', error);
    return {
      total: "0 GB",
      used: "0 GB",
      free: "0 GB", 
      usagePercent: 0,
      drive: "N/A"
    };
  }
}

async function getAdditionalDiskUsage() {
  const diskPath = process.env.ADDITIONAL_STORAGE_PATH;
  if (!diskPath) {
    return {
      status: "Not configured",
      path: "",
      used: "0 GB",
      total: "0 GB",
      percent: 0
    };
  }

  try {
    const formatDisk = (bytes) => {
      if (bytes >= 1099511627776) {
        return (bytes / 1099511627776).toFixed(2) + " TB";
      } else if (bytes >= 1073741824) {
        return (bytes / 1073741824).toFixed(2) + " GB";
      } else {
        return (bytes / 1048576).toFixed(2) + " MB";
      }
    };

    if (process.platform !== 'win32') {
      const { stdout } = await exec(`df -P -B1 "${diskPath}"`);
      const lines = stdout.trim().split('\n');
      if (lines.length >= 2) {
        // df -P ensures the output is on a single line even if filesystem name is long
        const dataLine = lines[lines.length - 1];
        const parts = dataLine.trim().split(/\s+/);
        if (parts.length >= 6) {
          const totalB = parseInt(parts[1], 10);
          const usedB = parseInt(parts[2], 10);
          const percentStr = parts[4].replace('%', '');
          const percent = parseInt(percentStr, 10);
          
          if (!isNaN(totalB) && !isNaN(usedB)) {
            return {
              status: "OK",
              path: diskPath,
              used: formatDisk(usedB),
              total: formatDisk(totalB),
              percent: isNaN(percent) ? 0 : percent
            };
          } else {
            console.error('Failed to parse df output numbers. Line:', dataLine);
          }
        } else {
          console.error('df output did not have enough columns. Line:', dataLine);
        }
      } else {
        console.error('df output did not have enough lines. Output:', stdout);
      }
    } else {
      const fsSize = await si.fsSize();
      const targetDisk = fsSize.find(disk => disk.mount === diskPath || disk.fs === diskPath);
      if (targetDisk) {
        const usagePercent = targetDisk.size > 0 ? Math.round(((targetDisk.size - targetDisk.available) / targetDisk.size) * 100) : 0;
        return {
          status: "OK",
          path: diskPath,
          used: formatDisk(targetDisk.size - targetDisk.available),
          total: formatDisk(targetDisk.size),
          percent: usagePercent
        };
      }
    }
    throw new Error("Disk not found or inaccessible");
  } catch (error) {
    console.error('Error in getAdditionalDiskUsage:', error.message);
    return {
      status: "Unavailable",
      path: diskPath,
      used: "0 GB",
      total: "0 GB",
      percent: 0
    };
  }
}

module.exports = { getSystemStats };