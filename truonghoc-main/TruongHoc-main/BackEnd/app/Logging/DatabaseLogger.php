<?php

namespace App\Logging;

use Monolog\Logger;
use App\Logging\DatabaseLogHandler;

class DatabaseLogger
{
    public function __invoke(array $config)
    {
        return new Logger('database', [
            new DatabaseLogHandler(),
        ]);
    }
}