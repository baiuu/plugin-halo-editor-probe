package baiuu.com.haloeditorprobe;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import run.halo.app.plugin.BasePlugin;
import run.halo.app.plugin.PluginContext;

/**
 * <p>Plugin main class to manage the lifecycle of the plugin.</p>
 * <p>This class must be public and have a public constructor.</p>
 * <p>Only one main class extending {@link BasePlugin} is allowed per plugin.</p>
 *
 * @author baiuu
 * @since 1.0.0
 */
@Slf4j
@Component
public class HaloEditorProbePlugin extends BasePlugin {

    public HaloEditorProbePlugin(PluginContext pluginContext) {
        super(pluginContext);
    }

    @Override
    public void start() {
        log.info("halo-editor-probe started");
    }

    @Override
    public void stop() {
        log.info("halo-editor-probe stopped");
    }
}
