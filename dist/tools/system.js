/**
 * TonMCP System Info Tool
 * System stats: CPU, memory, disks, uptime
 */
import { executeJson } from '../utils/powershell.js';
import { isError } from '../utils/errors.js';
export async function systemInfo() {
    // Get computer info
    const computerCommand = `Get-CimInstance -ClassName Win32_ComputerSystem | ` +
        `Select-Object @{N='CsName';E={$_.Name}}, ` +
        `@{N='CsNumberOfLogicalProcessors';E={$_.NumberOfLogicalProcessors}}; ` +
        `Get-CimInstance -ClassName Win32_OperatingSystem | ` +
        `Select-Object @{N='OsName';E={$_.Caption}}, @{N='OsVersion';E={$_.Version}}`;
    // Get hostname and OS info separately for reliability
    const hostnameResult = await executeJson(`Get-CimInstance Win32_ComputerSystem | Select-Object @{N='CsName';E={$_.Name}}`);
    const osResult = await executeJson(`Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version`);
    const coresResult = await executeJson(`Get-CimInstance Win32_ComputerSystem | Select-Object NumberOfLogicalProcessors`);
    // Get CPU info
    const cpuResult = await executeJson(`Get-CimInstance Win32_Processor | Select-Object Name, LoadPercentage | Select-Object -First 1`);
    // Get memory info
    const memoryResult = await executeJson(`Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory`);
    // Get disk info
    const diskResult = await executeJson(`Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Select-Object DeviceID, Size, FreeSpace`);
    // Get uptime
    const uptimeResult = await executeJson(`Get-CimInstance Win32_OperatingSystem | Select-Object LastBootUpTime`);
    // Extract hostname
    const hostname = !isError(hostnameResult) && hostnameResult
        ? hostnameResult.CsName || 'Unknown'
        : 'Unknown';
    // Extract OS info
    let osName = 'Windows';
    if (!isError(osResult) && osResult) {
        const os = osResult;
        osName = os.Caption || 'Windows';
        if (os.Version) {
            osName += ` (${os.Version})`;
        }
    }
    // Extract core count
    const cores = !isError(coresResult) && coresResult
        ? coresResult.NumberOfLogicalProcessors || 0
        : 0;
    // Extract CPU info
    let cpuName = 'Unknown';
    let cpuUsage = 0;
    if (!isError(cpuResult) && cpuResult) {
        const cpu = cpuResult;
        cpuName = cpu.Name || 'Unknown';
        cpuUsage = cpu.LoadPercentage || 0;
    }
    // Extract memory info
    let totalMemoryGb = 0;
    let usedMemoryGb = 0;
    let memoryPercent = 0;
    if (!isError(memoryResult) && memoryResult) {
        const mem = memoryResult;
        const totalKb = mem.TotalVisibleMemorySize || 0;
        const freeKb = mem.FreePhysicalMemory || 0;
        totalMemoryGb = Math.round(totalKb / (1024 * 1024) * 10) / 10;
        const freeGb = freeKb / (1024 * 1024);
        usedMemoryGb = Math.round((totalMemoryGb - freeGb) * 10) / 10;
        memoryPercent = totalMemoryGb > 0 ? Math.round((usedMemoryGb / totalMemoryGb) * 100) : 0;
    }
    // Extract disk info
    const disks = [];
    if (!isError(diskResult) && diskResult) {
        const rawDisks = Array.isArray(diskResult) ? diskResult : [diskResult];
        for (const disk of rawDisks) {
            if (disk && disk.DeviceID && disk.Size) {
                const totalGb = Math.round(disk.Size / (1024 * 1024 * 1024) * 10) / 10;
                const freeGb = Math.round((disk.FreeSpace || 0) / (1024 * 1024 * 1024) * 10) / 10;
                const percentUsed = totalGb > 0 ? Math.round(((totalGb - freeGb) / totalGb) * 100) : 0;
                disks.push({
                    name: disk.DeviceID,
                    total_gb: totalGb,
                    free_gb: freeGb,
                    percent_used: percentUsed,
                });
            }
        }
    }
    // Calculate uptime
    let uptimeHours = 0;
    if (!isError(uptimeResult) && uptimeResult) {
        const uptime = uptimeResult;
        if (uptime.LastBootUpTime) {
            try {
                const bootTime = new Date(uptime.LastBootUpTime);
                const now = new Date();
                const diffMs = now.getTime() - bootTime.getTime();
                uptimeHours = Math.round(diffMs / (1000 * 60 * 60) * 10) / 10;
            }
            catch {
                uptimeHours = 0;
            }
        }
    }
    return {
        hostname,
        os: osName,
        uptime_hours: uptimeHours,
        cpu: {
            name: cpuName,
            cores,
            usage_percent: cpuUsage,
        },
        memory: {
            total_gb: totalMemoryGb,
            used_gb: usedMemoryGb,
            percent: memoryPercent,
        },
        disks,
    };
}
//# sourceMappingURL=system.js.map